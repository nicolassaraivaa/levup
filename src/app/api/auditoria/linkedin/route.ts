import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

const OBJETIVO_LABELS: Record<string, string> = {
  primeiro_emprego: "conseguir o primeiro emprego na área",
  crescimento_carreira: "crescer na carreira atual",
  oportunidades_internacionais: "buscar oportunidades internacionais",
  melhoria_ssi: "melhorar o Social Selling Index (SSI) e a presença no LinkedIn",
};

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(
      `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`,
      "i",
    ),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function POST(req: NextRequest) {
  const { objetivo, url } = await req.json();

  if (!objetivo || !url) {
    return NextResponse.json(
      { error: "Preencha o objetivo e a URL do perfil." },
      { status: 400 },
    );
  }

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }
  if (!hostname.endsWith("linkedin.com")) {
    return NextResponse.json(
      { error: "Informe uma URL de perfil do LinkedIn (linkedin.com/in/...)." },
      { status: 400 },
    );
  }

  try {
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html",
      },
    });
    const html = await pageRes.text();

    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");

    const bloqueado =
      !ogTitle ||
      /log in|sign up|entrar|cadastr/i.test(ogTitle) ||
      ogTitle.trim().toLowerCase() === "linkedin";

    if (bloqueado) {
      return NextResponse.json(
        {
          error:
            "Não foi possível obter os dados públicos desse perfil. O LinkedIn costuma bloquear acessos automatizados — confirme se a URL está correta, se o perfil é público, e tente novamente.",
        },
        { status: 422 },
      );
    }

    const conteudoPublico = [ogTitle, ogDescription].filter(Boolean).join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1536,
      system: `Você é um especialista em recrutamento e otimização de perfis do LinkedIn para desenvolvedores júnior brasileiros.

O usuário quer usar o LinkedIn para ${OBJETIVO_LABELS[objetivo] || objetivo}.

Você recebeu apenas os dados públicos de pré-visualização do perfil (título e descrição expostos publicamente pelo LinkedIn), já que o conteúdo completo exige login. Trabalhe com o que está disponível e seja transparente sobre a limitação nas sugestões, orientando o candidato a manter essas informações públicas completas e otimizadas.

Responda APENAS em JSON válido com essa estrutura exata:
{
  "score": número de 0 a 100,
  "resumo": "parágrafo com avaliação geral do que é visível publicamente",
  "pontos_fortes": ["ponto 1", "ponto 2"],
  "gaps": ["gap 1", "gap 2"],
  "sugestoes": ["sugestão 1", "sugestão 2", "sugestão 3"]
}`,
      messages: [
        {
          role: "user",
          content: `Dados públicos do perfil do LinkedIn:\n\n${conteudoPublico}\n\nGere a análise.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const analise = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ analise });
  } catch (error) {
    console.error("Erro na auditoria de LinkedIn:", error);
    return NextResponse.json(
      { error: "Não foi possível analisar o perfil. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
