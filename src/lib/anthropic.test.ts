import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create };
  },
}));

import { gerarJson, MODELO } from "@/lib/anthropic";

function resposta(texto: string, stop_reason = "end_turn") {
  return { content: [{ type: "text", text: texto }], stop_reason };
}

const params = {
  max_tokens: 100,
  messages: [{ role: "user" as const, content: "oi" }],
};

beforeEach(() => {
  create.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("gerarJson", () => {
  it("devolve o objeto quando a primeira resposta é válida", async () => {
    create.mockResolvedValueOnce(resposta('{"score": 80}'));

    await expect(gerarJson(params, "teste")).resolves.toEqual({ score: 80 });
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ ...params, model: MODELO });
  });

  it("aceita JSON dentro de bloco de código markdown", async () => {
    create.mockResolvedValueOnce(resposta('```json\n{"ok": true}\n```'));

    await expect(gerarJson(params, "teste")).resolves.toEqual({ ok: true });
  });

  it("tenta de novo quando o JSON é inválido e devolve a segunda resposta", async () => {
    create
      .mockResolvedValueOnce(resposta('{"score": 80,'))
      .mockResolvedValueOnce(resposta('{"score": 90}'));

    await expect(gerarJson(params, "teste")).resolves.toEqual({ score: 90 });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("desiste depois de duas respostas inválidas, sem terceira chamada", async () => {
    create
      .mockResolvedValueOnce(resposta("não é json"))
      .mockResolvedValueOnce(resposta("também não"));

    await expect(gerarJson(params, "teste")).rejects.toThrow(SyntaxError);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("tenta de novo quando validar recusa e aceita a segunda resposta", async () => {
    create
      .mockResolvedValueOnce(resposta('{"sem_score": true}'))
      .mockResolvedValueOnce(resposta('{"score": 70}'));
    const validar = vi.fn((v: { score?: unknown }) => typeof v.score === "number");

    await expect(gerarJson(params, "teste", validar)).resolves.toEqual({ score: 70 });
    expect(validar).toHaveBeenCalledTimes(2);
  });

  it("falha quando validar recusa as duas respostas", async () => {
    create
      .mockResolvedValueOnce(resposta('{"a": 1}'))
      .mockResolvedValueOnce(resposta('{"a": 2}'));

    await expect(gerarJson(params, "teste", () => false)).rejects.toThrow(
      "Resposta da IA sem os campos esperados.",
    );
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("trata validar que lança exceção como resposta inválida", async () => {
    create
      .mockResolvedValueOnce(resposta('{"lista": null}'))
      .mockResolvedValueOnce(resposta('{"lista": [1]}'));
    const validar = (v: { lista: unknown[] }) => v.lista.length > 0;

    await expect(gerarJson(params, "teste", validar)).resolves.toEqual({ lista: [1] });
  });

  it('trata stop_reason "max_tokens" como inválido mesmo com JSON bem formado', async () => {
    create
      .mockResolvedValueOnce(resposta('{"melhorias": []}', "max_tokens"))
      .mockResolvedValueOnce(resposta('{"melhorias": [1, 2]}'));

    await expect(gerarJson(params, "teste")).resolves.toEqual({ melhorias: [1, 2] });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('falha quando as duas respostas são cortadas por "max_tokens"', async () => {
    create.mockResolvedValue(resposta('{"a": 1}', "max_tokens"));

    await expect(gerarJson(params, "teste")).rejects.toThrow(/max_tokens/);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("recusa resposta sem bloco de texto e JSON que não é objeto", async () => {
    create
      .mockResolvedValueOnce({ content: [], stop_reason: "end_turn" })
      .mockResolvedValueOnce(resposta("42"));

    await expect(gerarJson(params, "teste")).rejects.toThrow(
      "Resposta da IA sem os campos esperados.",
    );
  });
});
