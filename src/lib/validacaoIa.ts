import type {
  AnaliseLinkedIn,
  CurriculoGerado,
  MelhoriaLinkedIn,
  SecaoAnaliseLinkedIn,
} from "@/lib/types";

// Validação e normalização dos JSONs que a IA devolve na auditoria de
// LinkedIn e no gerador de CV.
//
// Regra: campos obrigatórios ausentes ou com tipo errado fazem `validar*`
// recusar a resposta (e gerarJson tenta de novo). Campos de lista ausentes
// não recusam: `normalizar*` troca por lista vazia, para que as telas e o PDF
// possam fazer .map sem quebrar. Também roda no navegador, sobre registros
// antigos do histórico.

type Objeto = Record<string, unknown>;

function ehObjeto(v: unknown): v is Objeto {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function ehNumero(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function ehTexto(v: unknown): v is string {
  return typeof v === "string";
}

/** Lista ausente (undefined/null) é aceita; presente, tem de ser array. */
function listaOpcional(v: unknown): boolean {
  return v === undefined || v === null || Array.isArray(v);
}

function texto(v: unknown): string {
  return ehTexto(v) ? v : "";
}

function lista(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function listaDeTextos(v: unknown): string[] {
  return lista(v).filter(ehTexto);
}

function listaDeObjetos(v: unknown): Objeto[] {
  return lista(v).filter(ehObjeto);
}

// ---------------------------------------------------------------------------
// Perguntas geradas (diagnóstico e entrevista)
// ---------------------------------------------------------------------------

/** Uma pergunta de entrevista tem uma ou duas frases; texto maior é desvio. */
export const MAX_PERGUNTA_IA = 800;

export function perguntaValida(v: unknown): v is string {
  return ehTexto(v) && v.trim() !== "" && v.length <= MAX_PERGUNTA_IA;
}

// ---------------------------------------------------------------------------
// Auditoria de LinkedIn
// ---------------------------------------------------------------------------

function secaoValida(v: unknown): v is Objeto {
  return (
    ehObjeto(v) &&
    ehTexto(v.analise) &&
    (v.score === null || ehNumero(v.score))
  );
}

export function validarAnaliseLinkedIn(v: unknown): boolean {
  if (!ehObjeto(v)) return false;
  const { experiencia, habilidades, educacao } = v;
  return (
    ehNumero(v.score) &&
    ehTexto(v.resumo) &&
    secaoValida(experiencia) &&
    secaoValida(habilidades) &&
    secaoValida(educacao) &&
    listaOpcional(experiencia.destaques) &&
    listaOpcional(habilidades.sugeridas) &&
    listaOpcional(v.melhorias) &&
    listaOpcional(v.acoes)
  );
}

function normalizarSecao(v: unknown): SecaoAnaliseLinkedIn {
  const secao = ehObjeto(v) ? v : {};
  return {
    score: ehNumero(secao.score) ? secao.score : null,
    analise: texto(secao.analise),
  };
}

const PRIORIDADES: MelhoriaLinkedIn["prioridade"][] = ["alta", "média", "baixa"];

function normalizarMelhoria(m: Objeto): MelhoriaLinkedIn {
  const prioridade = PRIORIDADES.find((p) => p === m.prioridade) ?? "média";
  return {
    titulo: texto(m.titulo),
    prioridade,
    esforco: texto(m.esforco),
    problema: texto(m.problema),
    solucao: texto(m.solucao),
    impacto_esperado: texto(m.impacto_esperado),
    exemplos: listaDeObjetos(m.exemplos).map((ex) => ({
      antes: texto(ex.antes),
      depois: texto(ex.depois),
    })),
    passo_a_passo: listaDeTextos(m.passo_a_passo),
  };
}

export function normalizarAnaliseLinkedIn(v: unknown): AnaliseLinkedIn {
  const a = ehObjeto(v) ? v : {};
  const experiencia = ehObjeto(a.experiencia) ? a.experiencia : {};
  const habilidades = ehObjeto(a.habilidades) ? a.habilidades : {};
  return {
    nome: texto(a.nome),
    headline: texto(a.headline),
    score: ehNumero(a.score) ? a.score : 0,
    resumo: texto(a.resumo),
    experiencia: {
      ...normalizarSecao(experiencia),
      destaques: listaDeTextos(experiencia.destaques),
    },
    habilidades: {
      ...normalizarSecao(habilidades),
      sugeridas: listaDeObjetos(habilidades.sugeridas).map((h) => ({
        nome: texto(h.nome),
        descricao: texto(h.descricao),
      })),
    },
    educacao: normalizarSecao(a.educacao),
    melhorias: listaDeObjetos(a.melhorias).map(normalizarMelhoria),
    acoes: listaDeTextos(a.acoes),
  };
}

// ---------------------------------------------------------------------------
// Currículo
// ---------------------------------------------------------------------------

export function validarCurriculo(v: unknown): boolean {
  if (!ehObjeto(v)) return false;
  return (
    ehTexto(v.nome) &&
    v.nome.trim() !== "" &&
    ehTexto(v.resumo) &&
    ehObjeto(v.contato) &&
    (v.titulo === undefined || ehTexto(v.titulo)) &&
    listaOpcional(v.experiencias) &&
    listaOpcional(v.formacao) &&
    listaOpcional(v.habilidades) &&
    listaOpcional(v.idiomas) &&
    listaOpcional(v.palavras_chave_alinhadas)
  );
}

export function normalizarCurriculo(v: unknown): CurriculoGerado {
  const c = ehObjeto(v) ? v : {};
  const contato = ehObjeto(c.contato) ? c.contato : {};
  return {
    nome: texto(c.nome),
    titulo: texto(c.titulo),
    contato: {
      email: texto(contato.email),
      telefone: texto(contato.telefone),
      localizacao: texto(contato.localizacao),
      linkedin: texto(contato.linkedin),
      github: texto(contato.github),
    },
    resumo: texto(c.resumo),
    experiencias: listaDeObjetos(c.experiencias).map((e) => ({
      cargo: texto(e.cargo),
      empresa: texto(e.empresa),
      periodo: texto(e.periodo),
      bullets: listaDeTextos(e.bullets),
    })),
    formacao: listaDeObjetos(c.formacao).map((f) => ({
      curso: texto(f.curso),
      instituicao: texto(f.instituicao),
      periodo: texto(f.periodo),
    })),
    habilidades: listaDeTextos(c.habilidades),
    idiomas: listaDeObjetos(c.idiomas).map((i) => ({
      idioma: texto(i.idioma),
      nivel: texto(i.nivel),
    })),
    palavras_chave_alinhadas: listaDeTextos(c.palavras_chave_alinhadas),
  };
}
