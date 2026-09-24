export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
}

export type ObjetivoAnalise =
  | "primeiro_emprego"
  | "crescimento_carreira"
  | "oportunidades_internacionais";

export interface SecaoAnaliseLinkedIn {
  score: number | null;
  analise: string;
}

export interface HabilidadeSugerida {
  nome: string;
  descricao: string;
}

export interface ExemploAntesDepois {
  antes: string;
  depois: string;
}

export interface MelhoriaLinkedIn {
  titulo: string;
  prioridade: "alta" | "média" | "baixa";
  esforco: string;
  problema: string;
  solucao: string;
  impacto_esperado: string;
  exemplos: ExemploAntesDepois[];
  passo_a_passo: string[];
}

export interface AnaliseLinkedIn {
  nome: string;
  headline: string;
  score: number;
  resumo: string;
  experiencia: SecaoAnaliseLinkedIn & { destaques: string[] };
  habilidades: SecaoAnaliseLinkedIn & { sugeridas: HabilidadeSugerida[] };
  educacao: SecaoAnaliseLinkedIn;
  melhorias: MelhoriaLinkedIn[];
  acoes: string[];
}

export type NivelAlvo = "estagio" | "junior" | "pleno";

export interface RespostaDiagnostico {
  categoria: string;
  pergunta: string;
  resposta: string;
}

export interface CategoriaScoreDiagnostico {
  categoria: string;
  score: number;
  comentario: string;
}

export interface ResultadoDiagnostico {
  score: number;
  nivel_percebido: string;
  categorias: CategoriaScoreDiagnostico[];
  pontos_fortes: string[];
  gaps: string[];
  recomendacoes: string[];
  proxima_acao: string;
  resumo: string;
}

export interface RespostaEntrevista {
  tipo: "tecnica" | "comportamental";
  tema: string;
  pergunta: string;
  resposta: string;
  score: number | null;
}

export interface FeedbackEntrevista {
  score: number;
  nivel: string;
  resumo: string;
  pontos_fortes: string[];
  pontos_melhoria: string[];
  dicas: string[];
}

export interface CurriculoExperiencia {
  cargo: string;
  empresa: string;
  periodo: string;
  bullets: string[];
}

export interface CurriculoFormacao {
  curso: string;
  instituicao: string;
  periodo: string;
}

export interface CurriculoIdioma {
  idioma: string;
  nivel: string;
}

export interface CurriculoGerado {
  nome: string;
  titulo: string;
  contato: {
    email: string;
    telefone: string;
    localizacao: string;
    linkedin: string;
    github: string;
  };
  resumo: string;
  experiencias: CurriculoExperiencia[];
  formacao: CurriculoFormacao[];
  habilidades: string[];
  idiomas: CurriculoIdioma[];
  palavras_chave_alinhadas: string[];
}
