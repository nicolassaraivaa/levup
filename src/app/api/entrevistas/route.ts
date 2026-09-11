import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { tipo, idioma, mensagens, etapa } = await req.json();

  try {
    if (etapa === "iniciar") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: `Você é um entrevistador técnico sênior de uma empresa de tecnologia brasileira conduzindo uma entrevista ${tipo === "tecnica" ? "técnica" : "comportamental"} para uma vaga de desenvolvedor júnior.

Idioma da entrevista: ${idioma === "PT" ? "Português" : "English"}.

Regras:
- Conduza a entrevista de forma natural e profissional
- Faça UMA pergunta por vez
- Para entrevistas técnicas: foque em conceitos de programação, estruturas de dados, algoritmos e boas práticas
- Para entrevistas comportamentais: foque em experiências, soft skills e situações do dia a dia
- Após cada resposta do candidato, faça uma pergunta de acompanhamento ou avance para um novo tópico
- Seja encorajador mas realista
- NÃO revele que é uma IA durante a entrevista
- Mantenha o personagem de entrevistador humano`,
        messages: [
          {
            role: "user",
            content:
              idioma === "PT"
                ? "Olá, estou pronto para a entrevista."
                : "Hello, I am ready for the interview.",
          },
        ],
      });

      const resposta =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ resposta });
    }

    if (etapa === "responder") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: `Você é um entrevistador técnico sênior conduzindo uma entrevista ${tipo === "tecnica" ? "técnica" : "comportamental"} para desenvolvedor júnior.
Idioma: ${idioma === "PT" ? "Português" : "English"}.
Faça UMA pergunta por vez. Seja natural e profissional. NÃO revele que é uma IA.`,
        messages: mensagens,
      });

      const resposta =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ resposta });
    }

    if (etapa === "feedback") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: `Você é um especialista em recrutamento e desenvolvimento de carreira para desenvolvedores.

Analise a entrevista completa e gere um feedback detalhado.

Responda APENAS em JSON válido com essa estrutura:
{
  "score": número de 0 a 100,
  "nivel": "iniciante" | "básico" | "intermediário",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_melhoria": ["melhoria 1", "melhoria 2", "melhoria 3"],
  "resumo": "parágrafo com avaliação geral do candidato",
  "dicas": ["dica 1", "dica 2", "dica 3"]
}`,
        messages: [
          {
            role: "user",
            content: `Analise essa entrevista ${tipo} em ${idioma} e gere o feedback:\n\n${JSON.stringify(mensagens, null, 2)}`,
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "{}";
      const feedback = JSON.parse(text.replace(/```json|```/g, "").trim());
      return NextResponse.json({ feedback });
    }

    return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na API de entrevistas:", error);
    return NextResponse.json(
      { error: "Não foi possível continuar a entrevista. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
