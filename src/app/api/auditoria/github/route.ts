import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

const OBJETIVO_LABELS: Record<string, string> = {
  primeiro_emprego: "conseguir o primeiro emprego na área",
  crescimento_carreira: "crescer na carreira atual",
  oportunidades_internacionais: "buscar oportunidades internacionais",
  melhoria_ssi: "melhorar sua presença profissional online",
};

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  company: string | null;
  blog: string | null;
}

interface GitHubRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  fork: boolean;
}

function extractUsername(url: string): string | null {
  const match = new URL(url).pathname.match(/^\/([^/]+)/);
  return match ? match[1] : null;
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
  let username: string | null;
  try {
    hostname = new URL(url).hostname;
    username = extractUsername(url);
  } catch {
    return NextResponse.json({ error: "URL inválida." }, { status: 400 });
  }
  if (!hostname.endsWith("github.com") || !username) {
    return NextResponse.json(
      { error: "Informe uma URL de perfil do GitHub (github.com/usuario)." },
      { status: 400 },
    );
  }

  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, {
        headers: { Accept: "application/vnd.github+json" },
      }),
      fetch(
        `https://api.github.com/users/${username}/repos?sort=pushed&per_page=10`,
        { headers: { Accept: "application/vnd.github+json" } },
      ),
    ]);

    if (userRes.status === 404) {
      return NextResponse.json(
        { error: "Usuário do GitHub não encontrado. Verifique a URL." },
        { status: 422 },
      );
    }
    if (!userRes.ok) {
      return NextResponse.json(
        {
          error:
            "Não foi possível consultar o GitHub agora (limite de requisições ou instabilidade). Tente novamente em instantes.",
        },
        { status: 502 },
      );
    }

    const user: GitHubUser = await userRes.json();
    const repos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];
    const repositoriosProprios = repos.filter((r) => !r.fork).slice(0, 8);

    const resumoRepos = repositoriosProprios
      .map(
        (r) =>
          `- ${r.name}${r.language ? ` (${r.language})` : ""}: ${
            r.description || "sem descrição"
          } — ${r.stargazers_count} estrelas`,
      )
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1536,
      system: `Você é um especialista em recrutamento técnico avaliando perfis do GitHub de desenvolvedores júnior brasileiros.

O usuário quer usar o GitHub para ${OBJETIVO_LABELS[objetivo] || objetivo}.

Avalie a qualidade do perfil com base em: bio/apresentação, quantidade e relevância dos repositórios, uso de descrições e linguagens, engajamento (stars/followers).

Responda APENAS em JSON válido com essa estrutura exata:
{
  "score": número de 0 a 100,
  "resumo": "parágrafo com avaliação geral do perfil",
  "pontos_fortes": ["ponto 1", "ponto 2"],
  "gaps": ["gap 1", "gap 2"],
  "sugestoes": ["sugestão 1", "sugestão 2", "sugestão 3"]
}`,
      messages: [
        {
          role: "user",
          content: `Perfil do GitHub:
Usuário: ${user.login}
Nome: ${user.name || "não informado"}
Bio: ${user.bio || "não informada"}
Empresa: ${user.company || "não informada"}
Repositórios públicos: ${user.public_repos}
Seguidores: ${user.followers}

Repositórios recentes (não-fork):
${resumoRepos || "Nenhum repositório próprio encontrado."}

Gere a análise.`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const analise = JSON.parse(text.replace(/```json|```/g, "").trim());
    return NextResponse.json({ analise });
  } catch (error) {
    console.error("Erro na auditoria de GitHub:", error);
    return NextResponse.json(
      { error: "Não foi possível analisar o perfil. Tente novamente em instantes." },
      { status: 502 },
    );
  }
}
