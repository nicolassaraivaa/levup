import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Rotas que dependem do JSON da IA: confirma que elas passam a validação ao
// gerarJson (resposta incompleta gera nova tentativa) e que devolvem listas
// vazias no lugar das ausentes.

const create = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

vi.mock("@/lib/auth", () => ({
  exigirUsuario: async () => ({ user: { id: "usuario-teste" }, erro: null }),
}));

import { POST as postAuditoria } from "@/app/api/auditoria/linkedin/route";
import { POST as postCv } from "@/app/api/cv/route";

function resposta(json: unknown) {
  return {
    content: [{ type: "text", text: JSON.stringify(json) }],
    stop_reason: "end_turn",
  };
}

function requisicao(rota: string, corpo: unknown) {
  return new NextRequest(`http://localhost${rota}`, {
    method: "POST",
    body: JSON.stringify(corpo),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  create.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("POST /api/auditoria/linkedin", () => {
  const corpo = { objetivo: "primeiro_emprego", modo: "texto", texto: "Perfil" };
  const secao = { score: 60, analise: "ok" };

  it("pede de novo quando falta campo obrigatório e completa as listas ausentes", async () => {
    create
      .mockResolvedValueOnce(resposta({ score: 70, resumo: "sem seções" }))
      .mockResolvedValueOnce(
        resposta({
          score: 70,
          resumo: "Perfil razoável",
          experiencia: secao,
          habilidades: secao,
          educacao: secao,
        }),
      );

    const res = await postAuditoria(requisicao("/api/auditoria/linkedin", corpo));
    const { analise } = await res.json();

    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
    expect(analise.melhorias).toEqual([]);
    expect(analise.acoes).toEqual([]);
    expect(analise.experiencia.destaques).toEqual([]);
    expect(analise.habilidades.sugeridas).toEqual([]);
  });

  it("responde 502 em português quando as duas respostas são inválidas", async () => {
    create.mockResolvedValue(resposta({ melhorias: "nenhuma" }));

    const res = await postAuditoria(requisicao("/api/auditoria/linkedin", corpo));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Não foi possível analisar o perfil/);
  });
});

describe("POST /api/cv", () => {
  const corpo = {
    nome: "Ana Souza",
    email: "ana@exemplo.com",
    telefone: "",
    objetivo: "Primeiro emprego como dev",
    experiencias: "Projeto X",
    formacao: "Ciência da Computação",
    habilidades: "React",
    vagaModo: "texto",
  };

  it("pede de novo quando falta campo obrigatório e completa as listas ausentes", async () => {
    create
      .mockResolvedValueOnce(resposta({ nome: "Ana Souza" }))
      .mockResolvedValueOnce(
        resposta({
          nome: "Ana Souza",
          resumo: "Dev em formação",
          contato: { email: "ana@exemplo.com" },
          experiencias: [{ cargo: "Dev", empresa: "Projeto X" }],
        }),
      );

    const res = await postCv(requisicao("/api/cv", corpo));
    const { curriculo } = await res.json();

    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledTimes(2);
    expect(curriculo.formacao).toEqual([]);
    expect(curriculo.habilidades).toEqual([]);
    expect(curriculo.idiomas).toEqual([]);
    expect(curriculo.experiencias[0].bullets).toEqual([]);
    expect(curriculo.contato.telefone).toBe("");
  });

  it("responde 502 em português quando as duas respostas são inválidas", async () => {
    create.mockResolvedValue(resposta({ nome: "Ana", experiencias: "texto" }));

    const res = await postCv(requisicao("/api/cv", corpo));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/Não foi possível gerar o CV/);
  });
});
