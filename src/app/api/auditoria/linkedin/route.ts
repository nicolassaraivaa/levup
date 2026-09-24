import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";

const OBJETIVO_LABELS: Record<string, string> = {
  primeiro_emprego: "conseguir o primeiro emprego na área",
  crescimento_carreira: "crescer na carreira atual",
  oportunidades_internacionais: "buscar oportunidades internacionais",
};

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

type Modo = "texto" | "imagem" | "pdf";

export async function POST(req: NextRequest) {
  const { objetivo, modo, texto, arquivo } = (await req.json()) as {
    objetivo: string;
    modo: Modo;
    texto?: string;
    arquivo?: { base64: string; mediaType: string };
  };

  if (!objetivo || !modo) {
    return NextResponse.json(
      { error: "Preencha o objetivo e envie o conteúdo do seu perfil." },
      { status: 400 },
    );
  }
  if (modo === "texto" && !texto?.trim()) {
    return NextResponse.json(
      { error: "Cole o texto do seu perfil do LinkedIn." },
      { status: 400 },
    );
  }
  if ((modo === "imagem" || modo === "pdf") && !arquivo?.base64) {
    return NextResponse.json(
      { error: "Envie um arquivo válido." },
      { status: 400 },
    );
  }
  if (modo === "imagem" && arquivo && !IMAGE_MEDIA_TYPES.includes(arquivo.mediaType)) {
    return NextResponse.json(
      { error: "Formato de imagem não suportado. Use JPEG, PNG, GIF ou WEBP." },
      { status: 400 },
    );
  }

  const objetivoLabel = OBJETIVO_LABELS[objetivo] || objetivo;

  const content: ContentBlockParam[] = [];

  if (modo === "imagem" && arquivo) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: arquivo.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: arquivo.base64,
      },
    });
    content.push({
      type: "text",
      text: "Essa é uma captura de tela do perfil do LinkedIn do candidato. Analise todas as informações visíveis. Gere a análise completa.",
    });
  } else if (modo === "pdf" && arquivo) {
    content.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: arquivo.base64 },
    });
    content.push({
      type: "text",
      text: "Esse é o PDF exportado do perfil do LinkedIn do candidato ('Salvar como PDF' do próprio LinkedIn). Analise todas as informações do documento. Gere a análise completa.",
    });
  } else {
    content.push({
      type: "text",
      text: `Texto colado do perfil do LinkedIn do candidato:\n\n${texto}\n\nGere a análise completa.`,
    });
  }

  try {
    const systemPrompt = `Você é uma recrutadora sênior especializada em LinkedIn, avaliando perfis de candidatos brasileiros de tecnologia.

O candidato quer usar o LinkedIn para ${objetivoLabel}.

Analise cuidadosamente todas as informações do perfil que foram enviadas (headline, seção "sobre", experiências, formação, habilidades) e produza uma auditoria completa, honesta e acionável — como a avaliação real de uma recrutadora experiente, não elogios genéricos.

Nos campos "antes" dos exemplos de melhoria, use trechos REAIS extraídos do que foi enviado (nunca invente o que o candidato já tem escrito).

Responda APENAS em JSON válido, sem markdown, com essa estrutura exata:
{
  "nome": "nome do candidato como aparece no perfil",
  "headline": "a headline atual do perfil, tal como está escrita",
  "score": número de 0 a 100 (nota geral do perfil),
  "resumo": "parágrafo avaliando o perfil como um todo, mencionando se está alinhado ao objetivo de ${objetivoLabel}",
  "experiencia": {
    "score": número de 0 a 100,
    "analise": "parágrafo avaliando a seção de experiências: clareza, quantificação de resultados, verbos de ação, profundidade",
    "destaques": ["destaque 1", "destaque 2", "destaque 3", "destaque 4"]
  },
  "habilidades": {
    "score": número de 0 a 100,
    "analise": "parágrafo avaliando as habilidades listadas e se cobrem o que o mercado busca para o objetivo do candidato",
    "sugeridas": [
      { "nome": "nome da habilidade a adicionar", "descricao": "uma frase de por que essa habilidade importa pro objetivo do candidato" }
    ] (de 3 a 6 sugestões)
  },
  "educacao": {
    "score": número de 0 a 100,
    "analise": "parágrafo avaliando a seção de formação acadêmica e certificações"
  },
  "melhorias": [
    {
      "titulo": "título objetivo da melhoria",
      "prioridade": "alta" | "média" | "baixa",
      "esforco": "vitória rápida" | "esforço médio" | "esforço alto",
      "problema": "o que está fraco ou ausente hoje, especificamente",
      "solucao": "o que fazer a respeito, de forma concreta",
      "impacto_esperado": "o que muda na prática pro candidato ao aplicar essa melhoria",
      "exemplos": [{ "antes": "trecho REAL atual extraído do perfil enviado", "depois": "reescrita sugerida e melhorada" }] (1 ou 2 exemplos),
      "passo_a_passo": ["passo 1", "passo 2", "passo 3", "passo 4"]
    }
  ] (gere de 2 a 4 melhorias, as mais impactantes primeiro),
  "acoes": ["próximo passo recomendado 1", "próximo passo recomendado 2", "próximo passo recomendado 3"]
}`;

    let analise: unknown = null;
    let erroParse: unknown = null;

    for (let tentativa = 0; tentativa < 2 && !analise; tentativa++) {
      const message = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });

      const text =
        message.content[0].type === "text" ? message.content[0].text : "{}";
      try {
        analise = JSON.parse(text.replace(/```json|```/g, "").trim());
      } catch (parseError) {
        erroParse = parseError;
        console.error(
          `Auditoria de LinkedIn: JSON inválido na tentativa ${tentativa + 1}, tentando de novo.`,
          parseError,
        );
      }
    }

    if (!analise) throw erroParse ?? new Error("Resposta da IA em formato inválido.");

    return NextResponse.json({ analise });
  } catch (error) {
    console.error("Erro na auditoria de LinkedIn:", error);
    return NextResponse.json(
      { error: "Não foi possível analisar o perfil. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
