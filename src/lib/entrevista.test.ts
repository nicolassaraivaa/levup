import { describe, expect, it } from "vitest";
import {
  deveContinuarEntrevista,
  MAXIMO_PERGUNTAS_ENTREVISTA,
  MINIMO_PERGUNTAS_ENTREVISTA,
  montarPlanoEntrevista,
} from "@/lib/entrevista";
import type { RespostaEntrevista } from "@/lib/types";

function respostas(...scores: (number | null)[]): RespostaEntrevista[] {
  return scores.map((score) => ({
    tipo: "tecnica",
    tema: "tema",
    pergunta: "pergunta",
    resposta: "resposta",
    score,
  }));
}

describe("montarPlanoEntrevista", () => {
  const plano = montarPlanoEntrevista("frontend");

  it("gera o número máximo de slots", () => {
    expect(plano).toHaveLength(MAXIMO_PERGUNTAS_ENTREVISTA);
  });

  it("intercala comportamental, técnica, técnica, abrindo e fechando em comportamental", () => {
    expect(plano.map((p) => p.tipo)).toEqual([
      "comportamental",
      "tecnica",
      "tecnica",
      "comportamental",
      "tecnica",
      "tecnica",
      "comportamental",
      "tecnica",
      "tecnica",
      "comportamental",
    ]);
  });

  it("não repete temas", () => {
    const temas = plano.map((p) => p.tema);
    expect(new Set(temas).size).toBe(temas.length);
  });
});

describe("deveContinuarEntrevista", () => {
  it("sempre continua antes do mínimo de perguntas", () => {
    expect(deveContinuarEntrevista(respostas(100, 100), 3)).toBe(true);
  });

  it("sempre encerra ao atingir o máximo", () => {
    expect(
      deveContinuarEntrevista(respostas(0, 0, 0), MAXIMO_PERGUNTAS_ENTREVISTA),
    ).toBe(false);
  });

  it("depois do mínimo, continua se as últimas respostas foram fracas", () => {
    expect(
      deveContinuarEntrevista(
        respostas(90, 90, 90, 40, 50, 30),
        MINIMO_PERGUNTAS_ENTREVISTA,
      ),
    ).toBe(true);
  });

  it("depois do mínimo, encerra se as últimas respostas foram boas", () => {
    expect(
      deveContinuarEntrevista(
        respostas(10, 10, 10, 80, 70, 90),
        MINIMO_PERGUNTAS_ENTREVISTA,
      ),
    ).toBe(false);
  });

  it("trata resposta sem nota como boa", () => {
    expect(
      deveContinuarEntrevista(
        respostas(null, null, 40),
        MINIMO_PERGUNTAS_ENTREVISTA,
      ),
    ).toBe(false);
  });
});
