import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsNonStreaming } from "@anthropic-ai/sdk/resources/messages";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export const MODELO = "claude-sonnet-4-5";

const TENTATIVAS_JSON = 2;

/**
 * Chama o modelo e interpreta a resposta como JSON. Se o texto vier fora do
 * formato (ou `validar` recusar o objeto), tenta de novo antes de desistir.
 */
export async function gerarJson<T>(
  params: Omit<MessageCreateParamsNonStreaming, "model">,
  rotulo: string,
  validar: (valor: T) => boolean = () => true,
): Promise<T> {
  let ultimoErro: unknown = null;

  for (let tentativa = 1; tentativa <= TENTATIVAS_JSON; tentativa++) {
    const message = await anthropic.messages.create({
      ...params,
      model: MODELO,
    });
    const text =
      message.content[0]?.type === "text" ? message.content[0].text : "";

    try {
      const valor = JSON.parse(text.replace(/```json|```/g, "").trim()) as T;
      if (valor && typeof valor === "object" && validar(valor)) return valor;
      ultimoErro = new Error("Resposta da IA sem os campos esperados.");
    } catch (parseError) {
      ultimoErro = parseError;
    }
    console.error(
      `${rotulo}: JSON inválido na tentativa ${tentativa}${tentativa < TENTATIVAS_JSON ? ", tentando de novo" : ""}.`,
      ultimoErro,
    );
  }

  throw ultimoErro ?? new Error("Resposta da IA em formato inválido.");
}
