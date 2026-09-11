import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { area, etapa, respostaUsuario, historico } = await req.json();

  try {
    // Etapa 1: gerar pergunta
    if (etapa === "pergunta") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: `Você é um avaliador técnico especializado em entrevistas para desenvolvedores júnior de ${area}.

Sua função é gerar perguntas técnicas progressivas para avaliar o nível do candidato.
Comece com perguntas básicas e aumente a dificuldade conforme as respostas.

Regras:
- Gere UMA pergunta por vez
- Seja direto e claro
- Foque em conceitos práticos que um dev júnior deve saber
- Responda APENAS com a pergunta, sem explicações adicionais`,
        messages: [
          ...historico,
          {
            role: "user",
            content:
              historico.length === 0
                ? `Inicie o diagnóstico técnico de ${area}. Faça a primeira pergunta básica.`
                : `O candidato respondeu: "${respostaUsuario}". Faça a próxima pergunta.`,
          },
        ],
      });

      const pergunta =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ pergunta });
    }

    // Etapa 2: gerar resultado final
    if (etapa === "resultado") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: `Você é um avaliador técnico especializado em desenvolvedores júnior de ${area}.

Analise o histórico completo do diagnóstico e gere um relatório detalhado.

Responda APENAS em JSON válido com essa estrutura exata:
{
  "score": número de 0 a 100,
  "nivel": "iniciante" | "básico" | "intermediário",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "resumo": "parágrafo resumindo o desempenho do candidato"
}`,
        messages: [
          {
            role: "user",
            content: `Histórico do diagnóstico de ${area}:\n\n${JSON.stringify(historico, null, 2)}\n\nGere o relatório final.`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "{}";
      const resultado = JSON.parse(text.replace(/```json|```/g, "").trim());
      return NextResponse.json({ resultado });
    }

    return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na API de diagnóstico:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o diagnóstico. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
