import { CATEGORIAS, type AreaDiagnostico } from "@/lib/diagnostico";
import type { RespostaEntrevista } from "@/lib/types";

export const MINIMO_PERGUNTAS_ENTREVISTA = 7;
export const MAXIMO_PERGUNTAS_ENTREVISTA = 10;
export const TEMPO_LIMITE_SEGUNDOS = 120;

// Score médio (das últimas respostas) abaixo do qual a entrevista se estende
// além do mínimo pra dar mais chances de confirmar/reverter uma dificuldade.
const LIMIAR_CONTINUAR = 55;

export const TEMAS_COMPORTAMENTAIS = [
  "Trabalho em equipe e colaboração",
  "Lidar com prazos apertados e priorização",
  "Resolver conflitos ou discordâncias técnicas",
  "Aprender algo novo rapidamente",
  "Lidar com feedback e críticas",
  "Um erro cometido e como você lidou com ele",
  "Motivação para essa vaga e área",
  "Comunicação com pessoas não técnicas",
];

export interface EtapaPlanoEntrevista {
  tipo: "tecnica" | "comportamental";
  tema: string;
}

/**
 * Monta até MAXIMO_PERGUNTAS_ENTREVISTA slots intercalando comportamental e
 * técnica (padrão comportamental, técnica, técnica, repetindo), como uma
 * entrevista real: abre e fecha em comportamental, com blocos técnicos
 * no meio. A sessão só consome além de MINIMO_PERGUNTAS_ENTREVISTA slots se
 * `deveContinuar` indicar que o candidato está com dificuldade.
 */
export function montarPlanoEntrevista(area: AreaDiagnostico): EtapaPlanoEntrevista[] {
  const temasTecnicos = CATEGORIAS[area];
  let iTec = 0;
  let iComp = 0;

  return Array.from({ length: MAXIMO_PERGUNTAS_ENTREVISTA }, (_, i) => {
    if (i % 3 === 0) {
      return {
        tipo: "comportamental" as const,
        tema: TEMAS_COMPORTAMENTAIS[iComp++ % TEMAS_COMPORTAMENTAIS.length],
      };
    }
    return {
      tipo: "tecnica" as const,
      tema: temasTecnicos[iTec++ % temasTecnicos.length],
    };
  });
}

/**
 * Decide se a entrevista continua depois da resposta que acabou de ser dada.
 * `respostasAnteriores` são as respostas já avaliadas ANTES dessa (usadas pra
 * medir a dificuldade recente, já que a nota da resposta atual ainda não
 * existe no momento da decisão); `totalRespondidasAgora` é a contagem já
 * incluindo a resposta atual, usada pros limites de mínimo/máximo.
 */
export function deveContinuarEntrevista(
  respostasAnteriores: RespostaEntrevista[],
  totalRespondidasAgora: number,
): boolean {
  if (totalRespondidasAgora < MINIMO_PERGUNTAS_ENTREVISTA) return true;
  if (totalRespondidasAgora >= MAXIMO_PERGUNTAS_ENTREVISTA) return false;

  const ultimas = respostasAnteriores.slice(-3);
  if (ultimas.length === 0) return false;

  const media =
    ultimas.reduce((soma, r) => soma + (r.score ?? 100), 0) / ultimas.length;
  return media < LIMIAR_CONTINUAR;
}

export type { AreaDiagnostico };
