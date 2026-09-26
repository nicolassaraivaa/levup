import { gerarJson } from "@/lib/anthropic";
import { exigirUsuario } from "@/lib/auth";
import { buscarUrlPublica } from "@/lib/buscarUrlPublica";
import { NextRequest, NextResponse } from "next/server";

type VagaModo = "texto" | "url";

const LIMITE_TEXTO_VAGA = 8000;

function extrairTextoHtml(html: string): string {
  const semScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const semTags = semScripts.replace(/<[^>]+>/g, " ");
  const decodificado = semTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  return decodificado.replace(/\s+/g, " ").trim();
}

async function buscarTextoDaVaga(url: string): Promise<string> {
  const html = await buscarUrlPublica(url);
  const texto = extrairTextoHtml(html).slice(0, LIMITE_TEXTO_VAGA);
  if (texto.length < 200) {
    throw new Error(
      "Não consegui extrair a descrição da vaga dessa URL (a página pode carregar o conteúdo via JavaScript). Cole o texto da vaga manualmente.",
    );
  }
  return texto;
}

export async function POST(req: NextRequest) {
  const { erro } = await exigirUsuario();
  if (erro) return erro;

  const {
    nome,
    email,
    telefone,
    localizacao,
    linkedin,
    github,
    objetivo,
    experiencias,
    formacao,
    habilidades,
    idiomas,
    vagaModo,
    vagaTexto,
    vagaUrl,
  } = (await req.json()) as {
    nome: string;
    email: string;
    telefone: string;
    localizacao?: string;
    linkedin?: string;
    github?: string;
    objetivo: string;
    experiencias: string;
    formacao: string;
    habilidades: string;
    idiomas?: string;
    vagaModo: VagaModo;
    vagaTexto?: string;
    vagaUrl?: string;
  };

  if (!nome || !email || !objetivo || !experiencias || !formacao || !habilidades) {
    return NextResponse.json(
      { error: "Preencha todos os campos obrigatórios." },
      { status: 400 },
    );
  }
  if (vagaModo === "url" && !vagaUrl?.trim()) {
    return NextResponse.json(
      { error: "Informe a URL da vaga." },
      { status: 400 },
    );
  }

  let vagaDescricao = "";
  if (vagaModo === "url" && vagaUrl) {
    try {
      vagaDescricao = await buscarTextoDaVaga(vagaUrl.trim());
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Não foi possível ler essa URL. Cole o texto da vaga manualmente.",
        },
        { status: 422 },
      );
    }
  } else if (vagaModo === "texto" && vagaTexto?.trim()) {
    vagaDescricao = vagaTexto.trim();
  }

  try {
    const systemPrompt = `Você é a redatora de currículos mais requisitada do mercado tech brasileiro — a redatora que recrutadores técnicos elogiam porque os currículos que ela escreve são exatamente os que eles param para ler.

Sua tarefa é transformar as informações reais do candidato em um currículo em JSON estruturado, profissional, otimizado para ATS (Applicant Tracking Systems) e ao mesmo tempo persuasivo para o olho humano de um recrutador.

Regras inegociáveis:
- NUNCA invente empresas, cargos, tecnologias, datas ou formação que o candidato não informou. Você pode reescrever, reorganizar e melhorar a redação do que foi dado, mas os fatos têm que ser reais.
- Transforme descrições soltas em bullets de impacto: comece com verbos de ação fortes, e inclua métricas/números sempre que o texto original permitir inferi-los honestamente (não invente números).
- Adapte o resumo profissional, a ordem de prioridade das habilidades e as palavras-chave da vaga (quando houver descrição de vaga) para maximizar aderência ATS — mas sem forçar habilidades que o candidato não possui.
- Português do Brasil, tom profissional e direto, sem clichês vazios ("proativo", "dinâmico" sem contexto).

${
  vagaDescricao
    ? `O candidato quer esse currículo focado especificamente na seguinte vaga. Leia a descrição, identifique os requisitos e palavras-chave mais importantes, e adapte resumo, ordem das habilidades e bullets de experiência para mostrar aderência real a ela:\n\n"""\n${vagaDescricao}\n"""`
    : "O candidato não informou uma vaga específica — gere um currículo forte e genérico para a área em que ele atua, guiado pelo objetivo profissional informado."
}

Responda APENAS em JSON válido, sem markdown, com essa estrutura exata:
{
  "nome": "nome completo do candidato",
  "titulo": "título profissional curto e forte, ex: 'Desenvolvedor Backend Jr. | Node.js & PostgreSQL' — adaptado à vaga quando houver uma",
  "contato": {
    "email": "email informado",
    "telefone": "telefone informado ou string vazia",
    "localizacao": "localização informada ou string vazia",
    "linkedin": "linkedin informado ou string vazia",
    "github": "github informado ou string vazia"
  },
  "resumo": "resumo profissional de 2 a 4 linhas, direto ao ponto, alinhado ao objetivo${vagaDescricao ? " e à vaga" : ""}",
  "experiencias": [
    {
      "cargo": "cargo",
      "empresa": "empresa ou projeto",
      "periodo": "período",
      "bullets": ["bullet de impacto 1", "bullet de impacto 2", "bullet de impacto 3"]
    }
  ],
  "formacao": [
    { "curso": "nome do curso", "instituicao": "instituição", "periodo": "período" }
  ],
  "habilidades": ["habilidade 1", "habilidade 2"] (ordenadas da mais relevante para a mais relevante para o objetivo/vaga),
  "idiomas": [{ "idioma": "idioma", "nivel": "nível" }] (lista vazia se não informado),
  "palavras_chave_alinhadas": ["palavra-chave da vaga que o currículo já cobre"] (lista vazia se não houver vaga)
}`;

    const userMessage = `Dados do candidato:

Nome: ${nome}
Email: ${email}
Telefone: ${telefone || "não informado"}
Localização: ${localizacao || "não informada"}
LinkedIn: ${linkedin || "não informado"}
GitHub: ${github || "não informado"}

Objetivo profissional:
${objetivo}

Experiências profissionais (texto livre do candidato):
${experiencias}

Formação acadêmica (texto livre do candidato):
${formacao}

Habilidades técnicas (texto livre do candidato):
${habilidades}

Idiomas: ${idiomas?.trim() || "não informado"}

Gere o currículo completo em JSON conforme a estrutura pedida.`;

    const curriculo = await gerarJson(
      {
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      },
      "Gerador de CV",
    );

    return NextResponse.json({ curriculo });
  } catch (error) {
    console.error("Erro na API de CV:", error);
    return NextResponse.json(
      { error: "Não foi possível gerar o CV. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
