import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";
import type { RespostaEntrevista } from "@/lib/types";
import { NIVEL_LABEL, type AreaDiagnostico, type NivelAlvo } from "@/lib/diagnostico";
import { deveContinuarEntrevista } from "@/lib/entrevista";

export async function POST(req: NextRequest) {
  const { area, nivel, etapa, respostas, tema, tipo } = (await req.json()) as {
    area: AreaDiagnostico;
    nivel: NivelAlvo;
    etapa: "pergunta" | "feedback";
    respostas: RespostaEntrevista[];
    tema?: string;
    tipo?: "tecnica" | "comportamental";
  };

  const nivelLabel = NIVEL_LABEL[nivel] ?? "júnior";

  try {
    if (etapa === "pergunta") {
      const anterior = respostas[respostas.length - 1];
      const anteriores = respostas.slice(0, -1);
      const continuar = anterior
        ? deveContinuarEntrevista(anteriores, respostas.length)
        : true;
      const pedirProximaPergunta = !anterior || continuar;

      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: `Você é um entrevistador de tecnologia conduzindo, em português, uma entrevista para uma vaga de ${area} nível ${nivelLabel}. A entrevista mistura perguntas técnicas e comportamentais, como uma entrevista real de verdade — nunca revele que você é uma IA.

${
  anterior
    ? `O candidato acabou de responder a uma pergunta do tipo "${anterior.tipo}" sobre o tema "${anterior.tema}":
Pergunta: "${anterior.pergunta}"
Resposta: "${anterior.resposta}"

Primeiro, avalie objetivamente essa resposta de 0 a 100, considerando o nível ${nivelLabel}.`
    : `Essa é a primeira pergunta da entrevista — ainda não há resposta anterior para avaliar.`
}

${
  pedirProximaPergunta
    ? `Agora gere a PRÓXIMA pergunta da entrevista, em PORTUGUÊS, do tipo "${tipo}" sobre o tema "${tema}".

Regras da próxima pergunta:
- Escreva em português, como um entrevistador real falaria.
- Uma pergunta só, direta, sem numeração.
- Se o tipo for "tecnica", foque em um conceito prático relacionado a "${tema}".
- Se o tipo for "comportamental", peça uma experiência ou situação real relacionada a "${tema}" (formato de pergunta comportamental de entrevista, tipo "Conte sobre uma vez em que...").
- Calibre a profundidade/dificuldade para o nível ${nivelLabel}.
- Pode conectar naturalmente com a resposta anterior, como um entrevistador faria, mas não é obrigatório.`
    : `A entrevista já cobriu perguntas suficientes e está sendo encerrada agora — NÃO gere uma próxima pergunta.`
}

Responda APENAS em JSON válido, sem markdown:
{ "score_ultima_resposta": ${anterior ? "número de 0 a 100" : "null"}${pedirProximaPergunta ? `, "pergunta": "a pergunta em português"` : ""} }`,
        messages: [
          ...respostas
            .map((r) => [
              { role: "assistant" as const, content: r.pergunta },
              { role: "user" as const, content: r.resposta },
            ])
            .flat(),
          {
            role: "user",
            content: anterior ? "Continue a entrevista." : "Comece a entrevista.",
          },
        ],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "{}";
      const data = JSON.parse(text.replace(/```json|```/g, "").trim());
      return NextResponse.json({ ...data, finalizado: !pedirProximaPergunta });
    }

    if (etapa === "feedback") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        system: `Você é um especialista em recrutamento e desenvolvimento de carreira para desenvolvedores de ${area}, nível ${nivelLabel}.

Analise a entrevista completa (perguntas técnicas e comportamentais, com as respostas do candidato e a nota que cada uma já recebeu) e gere um feedback consolidado, em português.

Responda APENAS em JSON válido com essa estrutura:
{
  "score": número de 0 a 100 (pode usar as notas individuais como referência, mas dê seu veredito consolidado),
  "nivel": "iniciante" | "básico" | "intermediário" | "avançado" (nível real demonstrado na entrevista),
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "pontos_melhoria": ["melhoria 1", "melhoria 2", "melhoria 3"],
  "resumo": "parágrafo com avaliação geral do candidato, mencionando tanto o lado técnico quanto o comportamental",
  "dicas": ["dica 1", "dica 2", "dica 3"]
}`,
        messages: [
          {
            role: "user",
            content: `Entrevista de ${area}, nível alvo ${nivelLabel}:\n\n${respostas
              .map(
                (r, i) =>
                  `${i + 1}. [${r.tipo} — ${r.tema}] (nota: ${r.score ?? "N/A"})\nQ: ${r.pergunta}\nA: ${r.resposta}`,
              )
              .join("\n\n")}\n\nGere o feedback final.`,
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
