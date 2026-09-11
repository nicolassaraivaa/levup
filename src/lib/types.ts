export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  area: string | null;
}

export type ObjetivoAnalise =
  | "primeiro_emprego"
  | "crescimento_carreira"
  | "oportunidades_internacionais"
  | "melhoria_ssi";

export interface AnaliseAuditoria {
  score: number;
  resumo: string;
  pontos_fortes: string[];
  gaps: string[];
  sugestoes: string[];
}

export interface AnaliseCV extends AnaliseAuditoria {
  ats_score: number;
  palavras_chave_faltando: string[];
}

export interface ResultadoDiagnostico {
  score: number;
  nivel: string;
  pontos_fortes: string[];
  gaps: string[];
  recomendacoes: string[];
  resumo: string;
}

export interface Mensagem {
  role: "user" | "assistant";
  content: string;
}

export interface FeedbackEntrevista {
  score: number;
  nivel: string;
  resumo: string;
  pontos_fortes: string[];
  pontos_melhoria: string[];
  dicas: string[];
}
