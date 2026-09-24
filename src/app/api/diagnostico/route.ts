import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";
import type { RespostaDiagnostico } from "@/lib/types";
import { NIVEL_LABEL, type AreaDiagnostico, type NivelAlvo } from "@/lib/diagnostico";

export async function POST(req: NextRequest) {
  const { area, nivel, etapa, respostas, categoria } = (await req.json()) as {
    area: AreaDiagnostico;
    nivel: NivelAlvo;
    etapa: "pergunta" | "resultado";
    respostas: RespostaDiagnostico[];
    categoria?: string;
  };

  const nivelLabel = NIVEL_LABEL[nivel] ?? "júnior";

  try {
    if (etapa === "pergunta") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        system: `Você é um avaliador técnico especializado em ${area}, entrevistando candidatos para vagas de nível ${nivelLabel}.

Sua tarefa é gerar UMA pergunta técnica sobre o tema: "${categoria}".

Regras:
- Calibre a dificuldade para o nível ${nivelLabel}: nem trivial demais, nem avançada demais para esse nível.
- Foque em conceitos práticos do dia a dia de quem trabalha com "${categoria}".
- Se esse tema já apareceu antes nesta sessão (veja o histórico), faça uma pergunta mais profunda ou um ângulo diferente do mesmo tema, nunca repita a mesma pergunta.
- Seja direto e claro, uma única pergunta.
- Responda APENAS com a pergunta, sem explicações, sem numeração, sem mencionar o nome do tema.`,
        messages: [
          ...respostas
            .map((r) => [
              { role: "assistant" as const, content: r.pergunta },
              { role: "user" as const, content: r.resposta },
            ])
            .flat(),
          {
            role: "user",
            content:
              respostas.length === 0
                ? `Inicie o diagnóstico técnico de ${area} para nível ${nivelLabel}. Faça a primeira pergunta sobre "${categoria}".`
                : `Faça a próxima pergunta, sobre "${categoria}".`,
          },
        ],
      });

      const pergunta =
        message.content[0].type === "text" ? message.content[0].text : "";
      return NextResponse.json({ pergunta, categoria });
    }

    if (etapa === "resultado") {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 3072,
        system: `Você é um avaliador técnico sênior especializado em ${area}, avaliando candidatos para vagas de nível ${nivelLabel}.

Você recebeu um diagnóstico estruturado com ${respostas.length} perguntas. Algumas competências podem ter sido perguntadas mais de uma vez (isso acontece quando o candidato já mostrou fragilidade nesse tema em diagnósticos anteriores, e o sistema aprofunda a checagem). Avalie CADA resposta individualmente considerando o nível ${nivelLabel} como referência, e depois consolide o resultado geral.

Responda APENAS em JSON válido com essa estrutura exata:
{
  "score": número de 0 a 100 (média geral ponderada),
  "nivel_percebido": "estágio" | "júnior" | "pleno" | "sênior" (nível real demonstrado nas respostas, independente do nível alvo buscado),
  "categorias": [
    { "categoria": "nome da competência", "score": número de 0 a 100, "comentario": "uma frase objetiva sobre o desempenho nessa competência" }
  ] (uma entrada para cada competência DISTINTA perguntada; se uma competência apareceu mais de uma vez, consolide em uma única entrada com a média das notas e um comentário que reflita as duas respostas),
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "gaps": ["gap 1", "gap 2", "gap 3"],
  "recomendacoes": ["recomendação 1", "recomendação 2", "recomendação 3"],
  "proxima_acao": "uma frase recomendando o próximo passo concreto do candidato dentro da plataforma (ex: praticar entrevista, revisar tema X)",
  "resumo": "parágrafo resumindo o desempenho do candidato, mencionando se o nível percebido está alinhado ao nível alvo (${nivelLabel})"
}`,
        messages: [
          {
            role: "user",
            content: `Diagnóstico de ${area} — nível alvo: ${nivelLabel}\n\n${respostas
              .map(
                (r, i) =>
                  `${i + 1}. [${r.categoria}]\nPergunta: ${r.pergunta}\nResposta do candidato: ${r.resposta}`,
              )
              .join("\n\n")}\n\nGere o relatório final.`,
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
