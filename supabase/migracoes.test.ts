import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Aplica as migrações de supabase/migrations num Postgres real (PGlite, em
// memória) e confere o isolamento por usuário (RLS) e o limite de histórico.
//
// O schema `auth` abaixo é um stub mínimo do Supabase: só a tabela
// auth.users, a função auth.uid() (que lê o "sub" do JWT, como no Supabase)
// e os papéis anon/authenticated com os mesmos GRANTs padrão do Supabase.
// Ou seja, só o RLS impede um usuário de ver o dado de outro.

const PASTA_MIGRACOES = path.join(__dirname, "migrations");

const TABELAS_HISTORICO = [
  "diagnostics",
  "interview_sessions",
  "profile_audits",
  "cv_generations",
] as const;

const STUB_AUTH = `
  create schema auth;
  create table auth.users (
    id uuid primary key,
    email text,
    raw_user_meta_data jsonb not null default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  create role anon nologin;
  create role authenticated nologin;
`;

const GRANTS_PADRAO_SUPABASE = `
  grant usage on schema public, auth to anon, authenticated;
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
`;

const ANA = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";

let db: PGlite;

/** Executa `fn` como o papel `authenticated` com o JWT do usuário. */
async function comoUsuario<T>(userId: string | null, fn: () => Promise<T>) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    userId ?? "",
  ]);
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function contar(tabela: string, userId: string) {
  const { rows } = await db.query<{ n: number }>(
    `select count(*)::int as n from public.${tabela} where user_id = $1`,
    [userId],
  );
  return rows[0].n;
}

/** Insere um registro com created_at explícito (minuto `n` de 2026). */
function inserir(tabela: string, userId: string, n: number, area = "frontend") {
  const criadoEm = new Date(Date.UTC(2026, 0, 1, 0, n)).toISOString();
  if (tabela === "diagnostics") {
    return db.query(
      "insert into public.diagnostics (user_id, area, score, created_at) values ($1, $2, $3, $4)",
      [userId, area, n, criadoEm],
    );
  }
  return db.query(
    `insert into public.${tabela} (user_id, created_at) values ($1, $2)`,
    [userId, criadoEm],
  );
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STUB_AUTH);
  const migracoes = readdirSync(PASTA_MIGRACOES)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  expect(migracoes).toHaveLength(3);
  for (const arquivo of migracoes) {
    await db.exec(readFileSync(path.join(PASTA_MIGRACOES, arquivo), "utf8"));
  }
  await db.exec(GRANTS_PADRAO_SUPABASE);
  await db.query(
    `insert into auth.users (id, email, raw_user_meta_data) values
       ($1, 'ana@exemplo.com', '{"name": "Ana"}'),
       ($2, 'bruno@exemplo.com', '{"name": "Bruno"}')`,
    [ANA, BRUNO],
  );
}, 60_000);

afterAll(async () => {
  await db?.close();
});

beforeEach(async () => {
  for (const tabela of TABELAS_HISTORICO) {
    await db.exec(`delete from public.${tabela}`);
  }
});

describe("migrações: perfil automático", () => {
  it("o trigger cria o perfil com o nome enviado no signUp", async () => {
    const { rows } = await db.query<{ id: string; name: string; email: string }>(
      "select id, name, email from public.profiles order by email",
    );
    expect(rows).toEqual([
      { id: ANA, name: "Ana", email: "ana@exemplo.com" },
      { id: BRUNO, name: "Bruno", email: "bruno@exemplo.com" },
    ]);
  });
});

describe("migrações: RLS", () => {
  it("as 5 tabelas têm RLS ativo e pelo menos uma política", async () => {
    const { rows } = await db.query<{ tabela: string; rls: boolean; politicas: number }>(
      `select c.relname as tabela, c.relrowsecurity as rls,
              (select count(*)::int from pg_policies p
                where p.schemaname = 'public' and p.tablename = c.relname) as politicas
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'r'
        order by c.relname`,
    );
    expect(rows.map((r) => r.tabela)).toEqual(
      ["profiles", ...TABELAS_HISTORICO].sort(),
    );
    for (const r of rows) {
      expect(r.rls, r.tabela).toBe(true);
      expect(r.politicas, r.tabela).toBeGreaterThan(0);
    }
  });

  it("cada usuário só lê o próprio perfil e não altera o dos outros", async () => {
    const lidos = await comoUsuario(BRUNO, () =>
      db.query<{ id: string }>("select id from public.profiles"),
    );
    expect(lidos.rows).toEqual([{ id: BRUNO }]);

    const alterados = await comoUsuario(BRUNO, () =>
      db.query("update public.profiles set name = 'invadido' where id = $1", [ANA]),
    );
    expect(alterados.affectedRows).toBe(0);
  });

  it.each(TABELAS_HISTORICO)(
    "%s: outro usuário não lê, não altera e não apaga registros alheios",
    async (tabela) => {
      await comoUsuario(ANA, () => inserir(tabela, ANA, 1));

      const lidos = await comoUsuario(BRUNO, () =>
        db.query(`select * from public.${tabela}`),
      );
      expect(lidos.rows).toHaveLength(0);

      const alterados = await comoUsuario(BRUNO, () =>
        db.query(`update public.${tabela} set created_at = now()`),
      );
      expect(alterados.affectedRows).toBe(0);

      const apagados = await comoUsuario(BRUNO, () =>
        db.query(`delete from public.${tabela}`),
      );
      expect(apagados.affectedRows).toBe(0);

      expect(await contar(tabela, ANA)).toBe(1);
      const proprios = await comoUsuario(ANA, () =>
        db.query(`select * from public.${tabela}`),
      );
      expect(proprios.rows).toHaveLength(1);
    },
  );

  it.each(TABELAS_HISTORICO)(
    "%s: ninguém insere registro em nome de outro usuário",
    async (tabela) => {
      await expect(
        comoUsuario(BRUNO, () => inserir(tabela, ANA, 1)),
      ).rejects.toThrow(/row-level security/);
    },
  );

  it("sem login (papel anon) nenhuma tabela devolve dados", async () => {
    await comoUsuario(ANA, () => inserir("cv_generations", ANA, 1));
    for (const tabela of ["profiles", ...TABELAS_HISTORICO]) {
      const { rows } = await comoUsuario(null, () =>
        db.query(`select * from public.${tabela}`),
      );
      expect(rows, tabela).toHaveLength(0);
    }
  });
});

describe("migrações: limite de 5 execuções", () => {
  it.each(["interview_sessions", "profile_audits", "cv_generations"])(
    "%s guarda só os 5 registros mais recentes de cada usuário",
    async (tabela) => {
      for (let n = 1; n <= 3; n++) {
        await comoUsuario(BRUNO, () => inserir(tabela, BRUNO, n));
      }
      for (let n = 1; n <= 7; n++) {
        await comoUsuario(ANA, () => inserir(tabela, ANA, 10 + n));
      }

      const { rows } = await db.query<{ minuto: number }>(
        `select extract(minute from created_at)::int as minuto
           from public.${tabela} where user_id = $1 order by created_at`,
        [ANA],
      );
      expect(rows.map((r) => r.minuto)).toEqual([13, 14, 15, 16, 17]);
      // O limite de um usuário não apaga nada do outro.
      expect(await contar(tabela, BRUNO)).toBe(3);
    },
  );

  it("diagnostics guarda 5 por área, separadamente", async () => {
    for (let n = 1; n <= 6; n++) {
      await comoUsuario(ANA, () => inserir("diagnostics", ANA, n, "frontend"));
    }
    for (let n = 1; n <= 2; n++) {
      await comoUsuario(ANA, () => inserir("diagnostics", ANA, 20 + n, "backend"));
    }

    const { rows } = await db.query<{ area: string; scores: number[] }>(
      `select area, array_agg(score order by created_at) as scores
         from public.diagnostics where user_id = $1 group by area order by area`,
      [ANA],
    );
    expect(rows).toEqual([
      { area: "backend", scores: [21, 22] },
      { area: "frontend", scores: [2, 3, 4, 5, 6] },
    ]);
  });
});
