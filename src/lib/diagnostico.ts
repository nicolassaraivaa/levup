export type AreaDiagnostico = "frontend" | "backend" | "fullstack" | "mobile";
export type NivelAlvo = "estagio" | "junior" | "pleno";

export const NIVEL_LABEL: Record<NivelAlvo, string> = {
  estagio: "estágio",
  junior: "júnior",
  pleno: "pleno",
};

// Pool de competências por área. É maior que MINIMO_PERGUNTAS de propósito:
// isso dá espaço pra montarPlanoCategorias priorizar pontos fracos e ainda
// assim variar o que é perguntado de uma sessão pra outra.
export const CATEGORIAS: Record<AreaDiagnostico, string[]> = {
  frontend: [
    "HTML semântico e acessibilidade",
    "Formulários e validação HTML",
    "CSS: box model e layout",
    "Flexbox e Grid",
    "Responsividade e media queries",
    "Fundamentos de JavaScript",
    "Funções, closures e contexto (this)",
    "Assincronismo: callbacks, promises, async/await",
    "Manipulação do DOM e eventos",
    "React: componentes e props",
    "React: hooks de estado (useState/useEffect)",
    "React: hooks avançados (useMemo/useCallback/useRef)",
    "Gerenciamento de estado global",
    "Performance no frontend",
    "Testes de componentes",
    "Git e fluxo de trabalho colaborativo",
  ],
  backend: [
    "Lógica de programação e estruturas de dados",
    "Complexidade e algoritmos básicos",
    "Node.js: event loop e módulos",
    "Express: rotas e middlewares",
    "Design de APIs REST",
    "Validação e tratamento de erros em APIs",
    "Banco de dados relacional: modelagem",
    "SQL: queries e joins",
    "ORMs e migrations",
    "Autenticação (sessões, JWT)",
    "Autorização e controle de acesso",
    "Segurança de aplicações",
    "Cache e performance de APIs",
    "Arquitetura e boas práticas de código",
    "Testes automatizados",
    "Git e fluxo de trabalho colaborativo",
  ],
  fullstack: [
    "Fundamentos de JavaScript",
    "Assincronismo: callbacks, promises, async/await",
    "Frontend: React componentes e props",
    "Frontend: hooks de estado",
    "Gerenciamento de estado no frontend",
    "Backend: Node.js e Express",
    "Design de APIs REST",
    "Banco de dados e modelagem",
    "Autenticação ponta a ponta",
    "Segurança de aplicações",
    "Integração frontend-backend",
    "Performance no frontend",
    "Performance e escalabilidade no backend",
    "Arquitetura e boas práticas",
    "Testes automatizados",
    "Git e fluxo de trabalho colaborativo",
  ],
  mobile: [
    "Fundamentos de JavaScript/TypeScript",
    "Assincronismo e chamadas de API",
    "React Native: componentes e props",
    "React Native: hooks e ciclo de vida",
    "Navegação entre telas",
    "Gerenciamento de estado mobile",
    "Consumo de APIs e tratamento de erros",
    "Armazenamento local e persistência",
    "UI responsiva e adaptação de telas",
    "Permissões e recursos nativos",
    "Performance e otimização mobile",
    "Notificações push",
    "Publicação nas lojas (build, versionamento)",
    "Testes em aplicações mobile",
    "Boas práticas e organização de código",
    "Git e fluxo de trabalho colaborativo",
  ],
};

export const MINIMO_PERGUNTAS = 15;

// Abaixo dessa média histórica, uma competência é considerada um ponto fraco
// e ganha uma segunda pergunta (mais profunda) na mesma sessão.
const LIMIAR_REFORCO = 45;
// Sem histórico, uma competência entra no meio da fila de prioridade —
// nem tratada como ponto fraco, nem descartada por já estar dominada.
const MEDIA_PADRAO_SEM_HISTORICO = 75;
const MAX_REFORCOS = 5;

export interface HistoricoCategoria {
  categoria: string;
  mediaScore: number;
}

/**
 * Agrega o histórico de diagnósticos anteriores (linhas da tabela `diagnostics`,
 * cada uma com `result.categorias`) em uma média de score por competência.
 */
export function agregarHistoricoCategorias(
  resultadosAnteriores: { categorias?: { categoria: string; score: number }[] }[],
): HistoricoCategoria[] {
  const somas = new Map<string, { soma: number; n: number }>();

  for (const resultado of resultadosAnteriores) {
    for (const c of resultado.categorias ?? []) {
      const atual = somas.get(c.categoria) ?? { soma: 0, n: 0 };
      atual.soma += c.score;
      atual.n += 1;
      somas.set(c.categoria, atual);
    }
  }

  return Array.from(somas.entries()).map(([categoria, { soma, n }]) => ({
    categoria,
    mediaScore: soma / n,
  }));
}

/**
 * Monta a lista de competências que serão perguntadas nesta sessão:
 * ordena o pool da área por média histórica (piores primeiro) e pega as
 * MINIMO_PERGUNTAS mais prioritárias; competências com média muito baixa
 * (< LIMIAR_REFORCO) ganham uma segunda pergunta de reforço no fim da lista.
 */
export function montarPlanoCategorias(
  area: AreaDiagnostico,
  historico: HistoricoCategoria[],
): string[] {
  const pool = CATEGORIAS[area];
  const mediaPorCategoria = new Map(
    historico.map((h) => [h.categoria, h.mediaScore]),
  );

  const ordenado = [...pool].sort((a, b) => {
    const mediaA = mediaPorCategoria.get(a) ?? MEDIA_PADRAO_SEM_HISTORICO;
    const mediaB = mediaPorCategoria.get(b) ?? MEDIA_PADRAO_SEM_HISTORICO;
    return mediaA - mediaB;
  });

  const plano = ordenado.slice(0, Math.min(MINIMO_PERGUNTAS, ordenado.length));

  const reforcos = plano
    .filter((c) => (mediaPorCategoria.get(c) ?? 100) < LIMIAR_REFORCO)
    .slice(0, MAX_REFORCOS);

  return [...plano, ...reforcos];
}
