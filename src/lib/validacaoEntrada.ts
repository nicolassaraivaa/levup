import {
  CATEGORIAS,
  NIVEL_LABEL,
  type AreaDiagnostico,
  type NivelAlvo,
} from "@/lib/diagnostico";
import {
  MAXIMO_PERGUNTAS_ENTREVISTA,
  TEMAS_COMPORTAMENTAIS,
} from "@/lib/entrevista";
import type {
  CurriculoGerado,
  ObjetivoAnalise,
  RespostaDiagnostico,
  RespostaEntrevista,
} from "@/lib/types";
import { normalizarCurriculo } from "@/lib/validacaoIa";

// Validação do corpo das 6 rotas de API. Tudo o que vai para um prompt de
// sistema (área, nível, competência, tema, tipo, objetivo) precisa ser um
// valor conhecido, e todo texto livre tem limite de tamanho: assim nenhum
// usuário consegue usar as rotas como chat livre nem gastar créditos com
// entradas enormes. Não importa nada do Next.js, então também roda no
// navegador (as telas usam os mesmos limites).

export const LIMITES = {
  respostasDiagnostico: 20,
  respostasEntrevista: MAXIMO_PERGUNTAS_ENTREVISTA,
  textoResposta: 4_000,
  textoPergunta: 4_000,
  textoLinkedin: 20_000,
  // Corpo da requisição na Vercel: 4,5 MB. O arquivo vai em base64.
  arquivoBase64: 4 * 1024 * 1024,
  curriculoPdf: 50_000,
  gaps: 20,
  textoGap: 300,
} as const;

/** Tamanho máximo do arquivo original (base64 ocupa 4/3 do tamanho). */
export const TAMANHO_MAXIMO_ARQUIVO = (LIMITES.arquivoBase64 / 4) * 3;

export const MENSAGEM_CORPO_INVALIDO =
  "Requisição inválida: o corpo precisa ser um JSON.";

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string };

const falha = (erro: string): { ok: false; erro: string } => ({ ok: false, erro });
const sucesso = <T>(dados: T): { ok: true; dados: T } => ({ ok: true, dados });

type Objeto = Record<string, unknown>;

function ehObjeto(v: unknown): v is Objeto {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function numero(n: number) {
  return n.toLocaleString("pt-BR");
}

function ehUmDe<T extends string>(valor: unknown, opcoes: readonly T[]): valor is T {
  return typeof valor === "string" && (opcoes as readonly string[]).includes(valor);
}

const AREAS = Object.keys(CATEGORIAS) as AreaDiagnostico[];
const NIVEIS = Object.keys(NIVEL_LABEL) as NivelAlvo[];

/**
 * Lê o corpo JSON sem deixar a exceção subir: corpo malformado vira
 * `undefined`, que os validadores recusam com 400.
 */
export async function lerCorpo(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

function validarAreaENivel(corpo: Objeto): Resultado<{ area: AreaDiagnostico; nivel: NivelAlvo }> {
  if (!ehUmDe(corpo.area, AREAS)) return falha("Área inválida.");
  if (!ehUmDe(corpo.nivel, NIVEIS)) return falha("Nível inválido.");
  return sucesso({ area: corpo.area, nivel: corpo.nivel });
}

/** Pergunta (gerada pela IA) e resposta (do usuário) dentro dos limites. */
function validarTextos(r: Objeto): string | null {
  if (typeof r.pergunta !== "string" || typeof r.resposta !== "string") {
    return "Formato das respostas inválido.";
  }
  if (r.pergunta.length > LIMITES.textoPergunta) {
    return `Cada pergunta pode ter no máximo ${numero(LIMITES.textoPergunta)} caracteres.`;
  }
  if (!r.resposta.trim()) return "Há uma resposta vazia.";
  if (r.resposta.length > LIMITES.textoResposta) {
    return `Cada resposta pode ter no máximo ${numero(LIMITES.textoResposta)} caracteres.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// /api/diagnostico
// ---------------------------------------------------------------------------

export interface EntradaDiagnostico {
  area: AreaDiagnostico;
  nivel: NivelAlvo;
  etapa: "pergunta" | "resultado";
  respostas: RespostaDiagnostico[];
  categoria?: string;
}

export function validarEntradaDiagnostico(corpo: unknown): Resultado<EntradaDiagnostico> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  const base = validarAreaENivel(corpo);
  if (!base.ok) return base;
  const { area, nivel } = base.dados;
  const competencias = CATEGORIAS[area];

  if (!ehUmDe(corpo.etapa, ["pergunta", "resultado"] as const)) return falha("Etapa inválida.");
  const etapa = corpo.etapa;

  if (!Array.isArray(corpo.respostas)) return falha("Formato das respostas inválido.");
  if (corpo.respostas.length > LIMITES.respostasDiagnostico) {
    return falha(`O diagnóstico aceita no máximo ${LIMITES.respostasDiagnostico} respostas.`);
  }
  if (etapa === "resultado" && corpo.respostas.length === 0) {
    return falha("Responda pelo menos uma pergunta antes de ver o resultado.");
  }
  const respostas: RespostaDiagnostico[] = [];
  for (const r of corpo.respostas) {
    if (!ehObjeto(r)) return falha("Formato das respostas inválido.");
    if (!ehUmDe(r.categoria, competencias)) return falha("Competência inválida para essa área.");
    const erro = validarTextos(r);
    if (erro) return falha(erro);
    respostas.push({ categoria: r.categoria, pergunta: r.pergunta as string, resposta: r.resposta as string });
  }

  if (etapa === "pergunta") {
    if (!ehUmDe(corpo.categoria, competencias)) return falha("Competência inválida para essa área.");
    return sucesso({ area, nivel, etapa, respostas, categoria: corpo.categoria });
  }
  return sucesso({ area, nivel, etapa, respostas });
}

// ---------------------------------------------------------------------------
// /api/entrevistas
// ---------------------------------------------------------------------------

type TipoPergunta = RespostaEntrevista["tipo"];

export interface EntradaEntrevista {
  area: AreaDiagnostico;
  nivel: NivelAlvo;
  etapa: "pergunta" | "feedback";
  respostas: RespostaEntrevista[];
  tema?: string;
  tipo?: TipoPergunta;
}

/** Técnica: competência da área. Comportamental: tema da lista fixa. */
function temaValido(area: AreaDiagnostico, tipo: TipoPergunta, tema: unknown): tema is string {
  return ehUmDe(tema, tipo === "tecnica" ? CATEGORIAS[area] : TEMAS_COMPORTAMENTAIS);
}

export function validarEntradaEntrevista(corpo: unknown): Resultado<EntradaEntrevista> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  const base = validarAreaENivel(corpo);
  if (!base.ok) return base;
  const { area, nivel } = base.dados;

  if (!ehUmDe(corpo.etapa, ["pergunta", "feedback"] as const)) return falha("Etapa inválida.");
  const etapa = corpo.etapa;

  if (!Array.isArray(corpo.respostas)) return falha("Formato das respostas inválido.");
  if (corpo.respostas.length > LIMITES.respostasEntrevista) {
    return falha(`A entrevista aceita no máximo ${LIMITES.respostasEntrevista} respostas.`);
  }
  if (etapa === "feedback" && corpo.respostas.length === 0) {
    return falha("Responda pelo menos uma pergunta antes de pedir o feedback.");
  }
  const respostas: RespostaEntrevista[] = [];
  for (const r of corpo.respostas) {
    if (!ehObjeto(r)) return falha("Formato das respostas inválido.");
    if (!ehUmDe(r.tipo, ["tecnica", "comportamental"] as const)) return falha("Tipo de pergunta inválido.");
    if (!temaValido(area, r.tipo, r.tema)) return falha("Tema inválido para essa área.");
    const erro = validarTextos(r);
    if (erro) return falha(erro);
    const score = r.score ?? null;
    if (score !== null && !(typeof score === "number" && score >= 0 && score <= 100)) {
      return falha("Nota de resposta inválida.");
    }
    respostas.push({
      tipo: r.tipo,
      tema: r.tema as string,
      pergunta: r.pergunta as string,
      resposta: r.resposta as string,
      score,
    });
  }

  if (etapa === "feedback") return sucesso({ area, nivel, etapa, respostas });

  // Enquanto não chegou ao máximo, a rota pode precisar gerar a próxima
  // pergunta, então o tipo e o tema dela são obrigatórios.
  const temProxima = respostas.length < LIMITES.respostasEntrevista;
  if (corpo.tipo === undefined && corpo.tema === undefined && !temProxima) {
    return sucesso({ area, nivel, etapa, respostas });
  }
  if (!ehUmDe(corpo.tipo, ["tecnica", "comportamental"] as const)) return falha("Tipo de pergunta inválido.");
  if (!temaValido(area, corpo.tipo, corpo.tema)) return falha("Tema inválido para essa área.");
  return sucesso({ area, nivel, etapa, respostas, tipo: corpo.tipo, tema: corpo.tema });
}

// ---------------------------------------------------------------------------
// /api/auditoria/linkedin
// ---------------------------------------------------------------------------

export const OBJETIVOS_ANALISE: readonly ObjetivoAnalise[] = [
  "primeiro_emprego",
  "crescimento_carreira",
  "oportunidades_internacionais",
];

export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type TipoImagem = (typeof TIPOS_IMAGEM)[number];

export type EntradaAuditoria =
  | { objetivo: ObjetivoAnalise; modo: "texto"; texto: string }
  | { objetivo: ObjetivoAnalise; modo: "imagem"; arquivo: { base64: string; mediaType: TipoImagem } }
  | { objetivo: ObjetivoAnalise; modo: "pdf"; arquivo: { base64: string } };

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export function validarEntradaAuditoria(corpo: unknown): Resultado<EntradaAuditoria> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  if (!corpo.objetivo || !corpo.modo) {
    return falha("Preencha o objetivo e envie o conteúdo do seu perfil.");
  }
  if (!ehUmDe(corpo.objetivo, OBJETIVOS_ANALISE)) return falha("Objetivo de análise inválido.");
  const objetivo = corpo.objetivo;

  if (corpo.modo === "texto") {
    if (typeof corpo.texto !== "string" || !corpo.texto.trim()) {
      return falha("Cole o texto do seu perfil do LinkedIn.");
    }
    if (corpo.texto.length > LIMITES.textoLinkedin) {
      return falha(`O texto do perfil pode ter no máximo ${numero(LIMITES.textoLinkedin)} caracteres.`);
    }
    return sucesso({ objetivo, modo: "texto", texto: corpo.texto });
  }

  if (corpo.modo !== "imagem" && corpo.modo !== "pdf") return falha("Modo de envio inválido.");
  const arquivo = corpo.arquivo;
  if (!ehObjeto(arquivo) || typeof arquivo.base64 !== "string" || !arquivo.base64) {
    return falha("Envie um arquivo válido.");
  }
  if (arquivo.base64.length > LIMITES.arquivoBase64) {
    return falha(`Arquivo muito grande. O limite é ${TAMANHO_MAXIMO_ARQUIVO / 1024 / 1024} MB.`);
  }
  if (!BASE64.test(arquivo.base64)) return falha("Envie um arquivo válido.");

  if (corpo.modo === "pdf") {
    return sucesso({ objetivo, modo: "pdf", arquivo: { base64: arquivo.base64 } });
  }
  if (!ehUmDe(arquivo.mediaType, TIPOS_IMAGEM)) {
    return falha("Formato de imagem não suportado. Use JPEG, PNG, GIF ou WEBP.");
  }
  return sucesso({
    objetivo,
    modo: "imagem",
    arquivo: { base64: arquivo.base64, mediaType: arquivo.mediaType },
  });
}

// ---------------------------------------------------------------------------
// /api/cv
// ---------------------------------------------------------------------------

const CAMPOS_CV = [
  { campo: "nome", rotulo: "Nome completo", max: 120, obrigatorio: true },
  { campo: "email", rotulo: "Email", max: 254, obrigatorio: true },
  { campo: "telefone", rotulo: "Telefone", max: 40, obrigatorio: false },
  { campo: "localizacao", rotulo: "Localização", max: 120, obrigatorio: false },
  { campo: "linkedin", rotulo: "LinkedIn", max: 300, obrigatorio: false },
  { campo: "github", rotulo: "GitHub", max: 300, obrigatorio: false },
  { campo: "objetivo", rotulo: "Objetivo Profissional", max: 2_000, obrigatorio: true },
  { campo: "experiencias", rotulo: "Experiências Profissionais", max: 8_000, obrigatorio: true },
  { campo: "formacao", rotulo: "Formação Acadêmica", max: 3_000, obrigatorio: true },
  { campo: "habilidades", rotulo: "Habilidades Técnicas", max: 2_000, obrigatorio: true },
  { campo: "idiomas", rotulo: "Idiomas", max: 500, obrigatorio: false },
  { campo: "vagaTexto", rotulo: "Vaga Desejada", max: 8_000, obrigatorio: false },
  { campo: "vagaUrl", rotulo: "Link da vaga", max: 2_000, obrigatorio: false },
] as const;

export type EntradaCv = Record<(typeof CAMPOS_CV)[number]["campo"], string> & {
  vagaModo: "texto" | "url";
};

export function validarEntradaCv(corpo: unknown): Resultado<EntradaCv> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  const dados: Record<string, string> = {};
  for (const { campo, rotulo, max, obrigatorio } of CAMPOS_CV) {
    const valor = corpo[campo] ?? "";
    if (typeof valor !== "string") return falha(`O campo "${rotulo}" precisa ser um texto.`);
    if (obrigatorio && !valor.trim()) return falha("Preencha todos os campos obrigatórios.");
    if (valor.length > max) {
      return falha(`O campo "${rotulo}" pode ter no máximo ${numero(max)} caracteres.`);
    }
    dados[campo] = valor;
  }
  if (!/^[^\s@]+@[^\s@]+$/.test(dados.email.trim())) return falha("Email inválido.");
  if (!ehUmDe(corpo.vagaModo, ["texto", "url"] as const)) return falha("Modo da vaga inválido.");
  if (corpo.vagaModo === "url" && !dados.vagaUrl.trim()) return falha("Informe a URL da vaga.");
  return sucesso({ ...(dados as Omit<EntradaCv, "vagaModo">), vagaModo: corpo.vagaModo });
}

// ---------------------------------------------------------------------------
// /api/cv/pdf
// ---------------------------------------------------------------------------

export function validarEntradaPdf(corpo: unknown): Resultado<CurriculoGerado> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  if (!ehObjeto(corpo.curriculo)) return falha("Currículo inválido.");
  if (JSON.stringify(corpo.curriculo).length > LIMITES.curriculoPdf) {
    return falha("Currículo grande demais para gerar o PDF.");
  }
  // Pode vir de um registro antigo do histórico: completa as listas que
  // faltarem para o CurriculoDocument não quebrar no .map.
  const curriculo = normalizarCurriculo(corpo.curriculo);
  if (!curriculo.nome.trim()) return falha("Currículo inválido.");
  return sucesso(curriculo);
}

// ---------------------------------------------------------------------------
// /api/dashboard/cursos
// ---------------------------------------------------------------------------

export interface EntradaCursos {
  area: AreaDiagnostico | null;
  gaps: string[];
}

export function validarEntradaCursos(corpo: unknown): Resultado<EntradaCursos> {
  if (!ehObjeto(corpo)) return falha(MENSAGEM_CORPO_INVALIDO);
  const area = corpo.area ?? null;
  if (area !== null && !ehUmDe(area, AREAS)) return falha("Área inválida.");
  const gaps = corpo.gaps ?? [];
  if (!Array.isArray(gaps)) return falha("Formato das dificuldades inválido.");
  if (gaps.length > LIMITES.gaps) {
    return falha(`Envie no máximo ${LIMITES.gaps} dificuldades.`);
  }
  for (const gap of gaps) {
    if (typeof gap !== "string") return falha("Formato das dificuldades inválido.");
    if (gap.length > LIMITES.textoGap) {
      return falha(`Cada dificuldade pode ter no máximo ${numero(LIMITES.textoGap)} caracteres.`);
    }
  }
  return sucesso({ area, gaps });
}
