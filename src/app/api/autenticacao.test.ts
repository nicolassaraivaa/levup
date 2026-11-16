import { readdirSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// RNF01: toda rota de /api responde 401 sem sessão e 429 sem cota de uso,
// antes de gastar qualquer recurso (Anthropic, busca de URL externa, geração
// de PDF). As rotas são descobertas no sistema de arquivos, então uma rota
// nova sem exigirUsuario() faz este teste falhar.

const getUser = vi.hoisted(() => vi.fn());
const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser }, rpc }),
}));

const create = vi.hoisted(() => vi.fn());
vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

const buscarUrlPublica = vi.hoisted(() => vi.fn());
vi.mock("@/lib/buscarUrlPublica", () => ({ buscarUrlPublica }));

const renderToBuffer = vi.hoisted(() => vi.fn());
vi.mock("@react-pdf/renderer", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  renderToBuffer,
}));

const METODOS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

// Corpo que passaria na validação de qualquer rota: sem a checagem de login,
// cada uma seguiria adiante e chamaria a IA, a busca de URL ou o PDF.
const CORPO_VALIDO = {
  area: "frontend",
  nivel: "junior",
  etapa: "pergunta",
  respostas: [],
  categoria: "Flexbox e Grid",
  tema: "Flexbox e Grid",
  tipo: "tecnica",
  objetivo: "primeiro_emprego",
  modo: "texto",
  texto: "Perfil do LinkedIn",
  nome: "Ana",
  email: "ana@exemplo.com",
  experiencias: "Projeto X",
  formacao: "Ciência da Computação",
  habilidades: "React",
  vagaModo: "url",
  vagaUrl: "https://vagas.exemplo.com/1",
  gaps: ["SQL"],
  curriculo: { nome: "Ana", resumo: "Dev", contato: {} },
};

function rotasDeApi(): string[] {
  return readdirSync(__dirname, { recursive: true, encoding: "utf8" })
    .filter((arquivo) => path.basename(arquivo) === "route.ts")
    .map((arquivo) => "/api/" + path.dirname(arquivo).split(path.sep).join("/"))
    .sort();
}

function requisicao(rota: string, metodo: string) {
  return new NextRequest(`http://localhost:3000${rota}`, {
    method: metodo,
    body: metodo === "GET" ? undefined : JSON.stringify(CORPO_VALIDO),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: null }, error: null });
  rpc.mockResolvedValue({ data: true, error: null });
});

// Nome que cada rota usa em registrar_uso_api (os limites ficam na migração).
const ROTA_LIMITADA: Record<string, string> = {
  "/api/auditoria/linkedin": "auditoria",
  "/api/cv": "cv",
  "/api/cv/pdf": "cv_pdf",
  "/api/dashboard/cursos": "cursos",
  "/api/diagnostico": "diagnostico",
  "/api/entrevistas": "entrevistas",
};

it("encontra todas as rotas de API do projeto", () => {
  expect(rotasDeApi()).toEqual([
    "/api/auditoria/linkedin",
    "/api/cv",
    "/api/cv/pdf",
    "/api/dashboard/cursos",
    "/api/diagnostico",
    "/api/entrevistas",
  ]);
});

describe.each(rotasDeApi())("%s", (rota) => {
  it("responde 401 sem sessão em todos os métodos e não gasta recursos", async () => {
    const arquivo = path.join(__dirname, rota.slice("/api/".length), "route.ts");
    const modulo = (await import(/* @vite-ignore */ arquivo)) as Record<string, unknown>;
    const metodos = METODOS.filter((m) => typeof modulo[m] === "function");
    expect(metodos.length).toBeGreaterThan(0);

    for (const metodo of metodos) {
      const handler = modulo[metodo] as (req: NextRequest) => Promise<Response>;
      const res = await handler(requisicao(rota, metodo));

      expect(res.status, metodo).toBe(401);
      expect(await res.json()).toEqual({ error: "Não autenticado." });
    }
    expect(getUser).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(buscarUrlPublica).not.toHaveBeenCalled();
    expect(renderToBuffer).not.toHaveBeenCalled();
  });

  it("responde 429 com a cota esgotada e não gasta recursos", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "usuario-teste" } }, error: null });
    rpc.mockResolvedValue({ data: false, error: null });
    const arquivo = path.join(__dirname, rota.slice("/api/".length), "route.ts");
    const modulo = (await import(/* @vite-ignore */ arquivo)) as Record<string, unknown>;

    const res = await (modulo.POST as (req: NextRequest) => Promise<Response>)(
      requisicao(rota, "POST"),
    );

    expect(res.status).toBe(429);
    expect((await res.json()).error).toMatch(/limite de uso/);
    expect(rpc).toHaveBeenCalledWith("registrar_uso_api", { p_rota: ROTA_LIMITADA[rota] });
    expect(create).not.toHaveBeenCalled();
    expect(buscarUrlPublica).not.toHaveBeenCalled();
    expect(renderToBuffer).not.toHaveBeenCalled();
  });
});

it("com sessão válida a rota segue adiante (o 401 vem mesmo da falta de login)", async () => {
  getUser.mockResolvedValue({ data: { user: { id: "usuario-teste" } }, error: null });
  const { POST } = await import("./dashboard/cursos/route");

  const res = await POST(
    new NextRequest("http://localhost:3000/api/dashboard/cursos", {
      method: "POST",
      body: JSON.stringify({ area: "frontend", gaps: [] }),
    }),
  );

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ sugestoes: [] });
});
