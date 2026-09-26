import { describe, expect, it } from "vitest";
import {
  agregarHistoricoCategorias,
  CATEGORIAS,
  MINIMO_PERGUNTAS,
  montarPlanoCategorias,
} from "@/lib/diagnostico";

describe("agregarHistoricoCategorias", () => {
  it("calcula a média de cada competência entre diagnósticos", () => {
    const historico = agregarHistoricoCategorias([
      {
        categorias: [
          { categoria: "SQL", score: 40 },
          { categoria: "Git", score: 90 },
        ],
      },
      { categorias: [{ categoria: "SQL", score: 60 }] },
    ]);

    expect(historico).toEqual(
      expect.arrayContaining([
        { categoria: "SQL", mediaScore: 50 },
        { categoria: "Git", mediaScore: 90 },
      ]),
    );
    expect(historico).toHaveLength(2);
  });

  it("ignora diagnósticos sem categorias", () => {
    expect(agregarHistoricoCategorias([{}, { categorias: [] }])).toEqual([]);
  });
});

describe("montarPlanoCategorias", () => {
  const pool = CATEGORIAS.backend;

  it("sem histórico, pergunta o mínimo de competências sem repetir nenhuma", () => {
    const plano = montarPlanoCategorias("backend", []);

    expect(plano).toHaveLength(MINIMO_PERGUNTAS);
    expect(new Set(plano).size).toBe(plano.length);
    plano.forEach((c) => expect(pool).toContain(c));
  });

  it("coloca os pontos fracos primeiro e repete os muito fracos no fim", () => {
    const plano = montarPlanoCategorias("backend", [
      { categoria: pool[5], mediaScore: 20 },
      { categoria: pool[9], mediaScore: 50 },
    ]);

    expect(plano[0]).toBe(pool[5]);
    expect(plano[1]).toBe(pool[9]);
    // Só a competência abaixo de 45 ganha reforço.
    expect(plano).toHaveLength(MINIMO_PERGUNTAS + 1);
    expect(plano.at(-1)).toBe(pool[5]);
  });

  it("deixa de fora a competência mais bem avaliada quando o pool é maior que o mínimo", () => {
    const plano = montarPlanoCategorias("backend", [
      { categoria: pool[0], mediaScore: 100 },
    ]);

    expect(plano).not.toContain(pool[0]);
  });

  it("limita os reforços a 5 por sessão", () => {
    const plano = montarPlanoCategorias(
      "backend",
      pool.map((categoria) => ({ categoria, mediaScore: 10 })),
    );

    expect(plano).toHaveLength(MINIMO_PERGUNTAS + 5);
  });
});
