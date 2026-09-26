import { gerarJson } from "@/lib/anthropic";
import { exigirUsuario } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { erro } = await exigirUsuario();
  if (erro) return erro;

  const { area, gaps } = (await req.json()) as {
    area: string | null;
    gaps: string[];
  };

  if (!gaps || gaps.length === 0) {
    return NextResponse.json({ sugestoes: [] });
  }

  try {
    const data = await gerarJson<{ sugestoes: unknown[] }>(
      {
        max_tokens: 1536,
        system: `Você é um mentor de carreira tech que recomenda o que estudar a seguir para desenvolvedores júnior de ${area || "tecnologia"}.

Você recebeu uma lista de dificuldades identificadas em diagnósticos técnicos, auditorias de perfil (LinkedIn, GitHub, currículo) e simulações de entrevista desse candidato. Agrupe dificuldades relacionadas entre si e sugira de 3 a 5 temas de estudo objetivos, dos mais urgentes para os menos urgentes.

Regras:
- NUNCA invente URLs ou nomes de cursos específicos que você não tenha certeza que existem.
- Em "onde_estudar", cite apenas nomes de plataformas, documentações ou canais amplamente conhecidos (ex.: "MDN Web Docs", "documentação oficial do React", "freeCodeCamp", "Rocketseat", "Origamid", "Alura"), sem link, só o nome.
- Priorize temas que aparecem repetidas vezes entre as dificuldades ou que são pré-requisito para os demais.

Responda APENAS em JSON válido com essa estrutura:
{
  "sugestoes": [
    { "tema": "nome objetivo do tema de estudo", "motivo": "uma frase conectando ao que foi identificado nas avaliações", "onde_estudar": ["nome 1", "nome 2"] }
  ]
}`,
        messages: [
          {
            role: "user",
            content: `Dificuldades identificadas nas avaliações do candidato:\n${gaps
              .map((g) => `- ${g}`)
              .join("\n")}\n\nGere as sugestões de estudo.`,
          },
        ],
      },
      "Sugestões de estudo",
      (d) => Array.isArray(d.sugestoes),
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao gerar sugestões de curso:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível gerar sugestões agora. Tente novamente em instantes.",
      },
      { status: 502 },
    );
  }
}
