import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

const OBJETIVO_LABELS: Record<string, string> = {
  primeiro_emprego: "conseguir o primeiro emprego na área",
  crescimento_carreira: "crescer na carreira atual",
  oportunidades_internacionais: "buscar oportunidades internacionais",
  melhoria_ssi: "se posicionar melhor profissionalmente",
};

export async function POST(req: NextRequest) {
  const { objetivo, texto } = await req.json();

  if (!objetivo || !texto || !texto.trim()) {
    return NextResponse.json(
      { error: "Preencha o objetivo e o texto do currículo." },
      { status: 400 },
    );
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1536,
      system: `Você é um especialista em recrutamento e análise de currículos para ATS (Applicant Tracking Systems), focado em desenvolvedores júnior brasileiros.

O usuário quer usar esse currículo para ${OBJETIVO_LABELS[objetivo] || objetivo}.

Responda APENAS em JSON válido com essa estrutura exata:
{
  "score": número de 0 a 100,
  "ats_score": número de 0 a 100 indicando compatibilidade com sistemas ATS,
  "resumo": "parágrafo com avaliação geral do currículo",
  "pontos_fortes": ["ponto 1", "ponto 2"],
  "gaps": ["gap 1", "gap 2"],
  "sugestoes": ["sugestão 1", "sugestão 2", "sugestão 3"],
  "palavras_chave_faltando": ["palavra 1", "palavra 2"]
}`,
      messages: [
        {
          role: "user",
          content: `Texto do currículo:\n\n${texto}\n\nGere a análise.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const analise = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ analise });
  } catch (error) {
    console.error("Erro na auditoria de CV:", error);
    return NextResponse.json(
      { error: "Não foi possível analisar o currículo. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
