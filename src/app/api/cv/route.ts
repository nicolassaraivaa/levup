import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const {
    nome,
    email,
    telefone,
    linkedin,
    github,
    objetivo,
    experiencias,
    formacao,
    habilidades,
    vaga,
  } = await req.json();

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 4096,
      system: `Você é um especialista em recrutamento e criação de currículos otimizados para ATS (Applicant Tracking Systems).

Sua função é gerar currículos profissionais em formato Markdown que:
- Sejam otimizados para sistemas ATS
- Usem palavras-chave relevantes para a vaga
- Destaquem conquistas com métricas quando possível
- Tenham linguagem profissional e objetiva
- Sejam adequados para desenvolvedores júnior brasileiros

Responda APENAS com o currículo em Markdown, sem explicações adicionais.`,
      messages: [
        {
          role: "user",
          content: `Gere um currículo profissional otimizado para ATS com os seguintes dados:

**Dados Pessoais:**
- Nome: ${nome}
- Email: ${email}
- Telefone: ${telefone}
- LinkedIn: ${linkedin || "Não informado"}
- GitHub: ${github || "Não informado"}

**Objetivo Profissional:**
${objetivo}

**Experiências Profissionais:**
${experiencias}

**Formação Acadêmica:**
${formacao}

**Habilidades Técnicas:**
${habilidades}

**Vaga Desejada:**
${vaga}

Gere um currículo completo, profissional e otimizado para essa vaga específica.`,
        },
      ],
    });

    const cv =
      message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ cv });
  } catch (error) {
    console.error("Erro na API de CV:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o CV. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
