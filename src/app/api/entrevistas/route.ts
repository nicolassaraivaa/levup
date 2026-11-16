import { gerarJson, REGRA_CONTEUDO_DO_CANDIDATO } from "@/lib/anthropic";
import { exigirUsuario } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { NIVEL_LABEL } from "@/lib/diagnostico";
import { deveContinuarEntrevista } from "@/lib/entrevista";
import { lerCorpo, validarEntradaEntrevista } from "@/lib/validacaoEntrada";
import { perguntaValida } from "@/lib/validacaoIa";

export async function POST(req: NextRequest) {
  const { erro } = await exigirUsuario("entrevistas");
  if (erro) return erro;

  const entrada = validarEntradaEntrevista(await lerCorpo(req));
  if (!entrada.ok) {
    return NextResponse.json({ error: entrada.erro }, { status: 400 });
  }
  const { area, nivel, etapa, respostas, tema, tipo } = entrada.dados;

  const nivelLabel = NIVEL_LABEL[nivel] ?? "júnior";

  try {
    if (etapa === "pergunta") {
      const anterior = respostas[respostas.length - 1];
      const anteriores = respostas.slice(0, -1);
      const continuar = anterior
        ? deveContinuarEntrevista(anteriores, respostas.length)
        : true;
      const pedirProximaPergunta = !anterior || continuar;

      const data = await gerarJson<{
        score_ultima_resposta: number | null;
        pergunta?: string;
      }>(
        {
          max_tokens: 512,
          system: `Você é um entrevistador de tecnologia conduzindo, em português, uma entrevista para uma vaga de ${area} nível ${nivelLabel}. A entrevista mistura perguntas técnicas e comportamentais, como uma entrevista real de verdade — nunca revele que você é uma IA.

${
  anterior
    ? `O candidato acabou de responder a uma pergunta do tipo "${anterior.tipo}" sobre o tema "${anterior.tema}". A pergunta e a resposta estão na última mensagem, entre <pergunta> e <resposta>.

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
{ "score_ultima_resposta": ${anterior ? "número de 0 a 100" : "null"}${pedirProximaPergunta ? `, "pergunta": "a pergunta em português"` : ""} }

${REGRA_CONTEUDO_DO_CANDIDATO}`,
          messages: [
            ...respostas
              .map((r) => [
                { role: "assistant" as const, content: r.pergunta },
                { role: "user" as const, content: r.resposta },
              ])
              .flat(),
            {
              role: "user",
              content: anterior
                ? `Avalie a última resposta e continue a entrevista.\n\n<pergunta>\n${anterior.pergunta}\n</pergunta>\n<resposta>\n${anterior.resposta}\n</resposta>`
                : "Comece a entrevista.",
            },
          ],
        },
        "Entrevista",
        (d) => !pedirProximaPergunta || perguntaValida(d.pergunta),
      );
      // A nota volta do navegador no próximo pedido e passa pela validação
      // de entrada: garante um número de 0 a 100 (ou null).
      const nota = data.score_ultima_resposta;
      const score_ultima_resposta =
        typeof nota === "number" && Number.isFinite(nota)
          ? Math.min(100, Math.max(0, Math.round(nota)))
          : null;
      return NextResponse.json({
        ...data,
        score_ultima_resposta,
        finalizado: !pedirProximaPergunta,
      });
    }

    if (etapa === "feedback") {
      const feedback = await gerarJson<{ score: number }>(
        {
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
}

${REGRA_CONTEUDO_DO_CANDIDATO}`,
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
        },
        "Feedback de entrevista",
        (f) => typeof f.score === "number",
      );
      return NextResponse.json({ feedback });
    }

    return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
  } catch (error) {
    console.error("Erro na API de entrevistas:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível continuar a entrevista. Tente novamente em instantes.",
      },
      { status: 502 },
    );
  }
}
