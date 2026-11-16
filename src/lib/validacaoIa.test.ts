import { describe, expect, it } from "vitest";
import {
  normalizarAnaliseLinkedIn,
  normalizarCurriculo,
  validarAnaliseLinkedIn,
  validarCurriculo,
} from "@/lib/validacaoIa";

const secao = { score: 70, analise: "ok" };

const analiseMinima = {
  score: 72,
  resumo: "Perfil bom.",
  experiencia: secao,
  habilidades: secao,
  educacao: { score: null, analise: "Sem formação informada." },
};

const curriculoMinimo = {
  nome: "Ana Souza",
  resumo: "Desenvolvedora.",
  contato: { email: "ana@exemplo.com" },
};

describe("validarAnaliseLinkedIn", () => {
  it("aceita a resposta com os campos obrigatórios, mesmo sem as listas", () => {
    expect(validarAnaliseLinkedIn(analiseMinima)).toBe(true);
  });

  it.each([
    ["score ausente", { ...analiseMinima, score: undefined }],
    ["score como texto", { ...analiseMinima, score: "72" }],
    ["resumo ausente", { ...analiseMinima, resumo: undefined }],
    ["seção ausente", { ...analiseMinima, experiencia: undefined }],
    ["seção sem análise", { ...analiseMinima, educacao: { score: 50 } }],
    ["melhorias que não é lista", { ...analiseMinima, melhorias: "nenhuma" }],
    ["ações que não é lista", { ...analiseMinima, acoes: {} }],
    [
      "destaques que não é lista",
      { ...analiseMinima, experiencia: { ...secao, destaques: "x" } },
    ],
    ["valor que não é objeto", []],
  ])("recusa %s", (_, valor) => {
    expect(validarAnaliseLinkedIn(valor)).toBe(false);
  });
});

describe("normalizarAnaliseLinkedIn", () => {
  it("troca listas ausentes por listas vazias", () => {
    const a = normalizarAnaliseLinkedIn(analiseMinima);

    expect(a.melhorias).toEqual([]);
    expect(a.acoes).toEqual([]);
    expect(a.experiencia.destaques).toEqual([]);
    expect(a.habilidades.sugeridas).toEqual([]);
    expect(a.nome).toBe("");
  });

  it("completa os campos de cada melhoria e descarta itens inválidos", () => {
    const a = normalizarAnaliseLinkedIn({
      ...analiseMinima,
      melhorias: [{ titulo: "Headline", prioridade: "urgente" }, "lixo", null],
      acoes: ["Atualizar foto", 3],
    });

    expect(a.melhorias).toHaveLength(1);
    expect(a.melhorias[0]).toMatchObject({
      titulo: "Headline",
      prioridade: "média",
      exemplos: [],
      passo_a_passo: [],
    });
    expect(a.acoes).toEqual(["Atualizar foto"]);
  });

  it("não quebra com registro vazio do histórico", () => {
    const a = normalizarAnaliseLinkedIn(null);

    expect(a.experiencia).toEqual({ score: null, analise: "", destaques: [] });
    expect(a.melhorias).toEqual([]);
  });
});

describe("validarCurriculo", () => {
  it("aceita o currículo com os campos obrigatórios, mesmo sem as listas", () => {
    expect(validarCurriculo(curriculoMinimo)).toBe(true);
  });

  it.each([
    ["nome vazio", { ...curriculoMinimo, nome: "  " }],
    ["nome ausente", { ...curriculoMinimo, nome: undefined }],
    ["resumo ausente", { ...curriculoMinimo, resumo: undefined }],
    ["contato ausente", { ...curriculoMinimo, contato: undefined }],
    ["título que não é texto", { ...curriculoMinimo, titulo: 1 }],
    ["experiências que não é lista", { ...curriculoMinimo, experiencias: "x" }],
    ["habilidades que não é lista", { ...curriculoMinimo, habilidades: "React" }],
    ["formação que não é lista", { ...curriculoMinimo, formacao: {} }],
  ])("recusa %s", (_, valor) => {
    expect(validarCurriculo(valor)).toBe(false);
  });
});

describe("normalizarCurriculo", () => {
  it("troca listas ausentes por listas vazias e completa o contato", () => {
    const c = normalizarCurriculo(curriculoMinimo);

    expect(c.experiencias).toEqual([]);
    expect(c.formacao).toEqual([]);
    expect(c.habilidades).toEqual([]);
    expect(c.idiomas).toEqual([]);
    expect(c.palavras_chave_alinhadas).toEqual([]);
    expect(c.contato).toEqual({
      email: "ana@exemplo.com",
      telefone: "",
      localizacao: "",
      linkedin: "",
      github: "",
    });
  });

  it("completa bullets ausentes nas experiências", () => {
    const c = normalizarCurriculo({
      ...curriculoMinimo,
      experiencias: [{ cargo: "Dev", empresa: "X" }],
    });

    expect(c.experiencias[0]).toEqual({
      cargo: "Dev",
      empresa: "X",
      periodo: "",
      bullets: [],
    });
  });
});
