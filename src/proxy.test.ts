import { readdirSync } from "node:fs";
import path from "node:path";
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// RNF01: o proxy redireciona para /login quem tenta abrir uma página interna
// sem sessão. As páginas são descobertas em src/app, então uma página nova
// que não estiver na lista de protegidas (nem na de públicas) faz o teste
// falhar.

const sessao = vi.hoisted(() => ({ usuario: null as { id: string } | null }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: { getUser: async () => ({ data: { user: sessao.usuario }, error: null }) },
  }),
}));

import { config, proxy } from "@/proxy";

const PUBLICAS = ["/", "/cadastro", "/login"];
const BASE = "http://localhost:3000";

function paginas(): string[] {
  const app = path.join(__dirname, "app");
  return readdirSync(app, { recursive: true, encoding: "utf8" })
    .filter((arquivo) => path.basename(arquivo) === "page.tsx")
    .map((arquivo) => {
      const segmentos = path
        .dirname(arquivo)
        .split(path.sep)
        .filter((s) => s !== "." && !/^\(.*\)$/.test(s));
      return "/" + segmentos.join("/");
    })
    .sort();
}

const PROTEGIDAS = paginas().filter((p) => !PUBLICAS.includes(p));

beforeEach(() => {
  sessao.usuario = null;
});

it("encontra todas as páginas do projeto", () => {
  expect(paginas()).toEqual([
    "/",
    "/auditoria",
    "/cadastro",
    "/configuracoes",
    "/cv",
    "/dashboard",
    "/diagnostico",
    "/entrevistas",
    "/login",
  ]);
});

describe("sem sessão", () => {
  it.each(PROTEGIDAS)("%s redireciona para /login", async (pagina) => {
    expect(unstable_doesMiddlewareMatch({ config, url: pagina })).toBe(true);

    for (const url of [pagina, `${pagina}/qualquer`, `${pagina}?aba=1`]) {
      const res = await proxy(new NextRequest(BASE + url));
      expect(getRedirectUrl(res), url).toBe(`${BASE}/login`);
    }
  });

  it.each(PUBLICAS)("%s abre normalmente", async (pagina) => {
    const res = await proxy(new NextRequest(BASE + pagina));
    expect(getRedirectUrl(res)).toBeNull();
  });
});

describe("com sessão", () => {
  beforeEach(() => {
    sessao.usuario = { id: "usuario-teste" };
  });

  it.each(PROTEGIDAS)("%s abre normalmente", async (pagina) => {
    const res = await proxy(new NextRequest(BASE + pagina));
    expect(getRedirectUrl(res)).toBeNull();
  });

  it.each(["/login", "/cadastro"])("%s manda para o dashboard", async (pagina) => {
    const res = await proxy(new NextRequest(BASE + pagina));
    expect(getRedirectUrl(res)).toBe(`${BASE}/dashboard`);
  });
});
