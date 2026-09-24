# LevUp

LevUp é uma plataforma de aceleração de carreira para desenvolvedores júnior/em transição, com quatro ferramentas potencializadas por IA (Claude, via API da Anthropic): diagnóstico técnico adaptativo, simulador de entrevistas, auditoria de perfil do LinkedIn e gerador de currículo em PDF.

Todas as features guardam **histórico das últimas 5 execuções** por usuário e alimentam um **dashboard** com score de prontidão para o mercado, ponto fraco recorrente e sugestões de estudo geradas por IA.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Linguagem | TypeScript |
| UI | React 19, Tailwind CSS v4 (tokens via `@theme inline`, sem arquivo de config separado) |
| Ícones | lucide-react |
| Fontes | IBM Plex Sans (texto) e IBM Plex Mono (dados/labels), via `next/font` |
| Autenticação e banco | Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — Postgres + Auth |
| IA | Anthropic Claude (`@anthropic-ai/sdk`), modelo `claude-sonnet-4-5` |
| Geração de PDF | `@react-pdf/renderer` (PDF vetorial, texto selecionável — importante para ATS) |
| Lint | ESLint 9 (`eslint-config-next`) |

> ⚠️ Este projeto usa uma versão do Next.js com mudanças de comportamento em relação à documentação pública padrão (ver `AGENTS.md`/`CLAUDE.md` na raiz — esse bloco é reescrito automaticamente pelo `next dev`, não remova manualmente). Ao mexer em convenções do framework, consulte `node_modules/next/dist/docs/` antes de assumir o comportamento "clássico" do Next.js.

## Funcionalidades

### 1. Diagnóstico de Competências (`/diagnostico`)
Quiz técnico adaptativo com no mínimo **15 perguntas**, calibrado pela área (frontend, backend, full stack, mobile) e nível alvo (estágio, júnior, pleno) escolhidos pelo usuário.

- O pool de competências por área vive em `src/lib/diagnostico.ts` (`CATEGORIAS`), com 16 temas cada.
- `montarPlanoCategorias()` prioriza as competências com **pior média histórica** do usuário (agregada de diagnósticos anteriores via `agregarHistoricoCategorias()`), e dá uma segunda pergunta de reforço para os pontos mais fracos (média < 45) — ou seja, o sistema aprende com o histórico e foca mais nos gaps recorrentes a cada nova tentativa.
- Perguntas e avaliação de cada resposta são geradas pela IA (`POST /api/diagnostico`).
- Resultado salvo na tabela `diagnostics`.

### 2. Simulador de Entrevistas (`/entrevistas`)
Entrevista em português, sempre misturando perguntas **técnicas e comportamentais** (sem seletor de tipo/idioma — é automático e fixo em PT-BR).

- Mínimo de **7 perguntas**, podendo se estender até **10** se `deveContinuarEntrevista()` (`src/lib/entrevista.ts`) detectar dificuldade nas últimas respostas (média < 55).
- Intercala comportamental → técnica → técnica, abrindo e fechando em comportamental, como uma entrevista real.
- **Tempo limite de 2 minutos por resposta** — se estourar, a entrevista é cancelada automaticamente (tela dedicada de "tempo esgotado", nenhum dado é salvo nesse caso).
- Ao final, a IA gera feedback completo: score, nível percebido, pontos fortes, pontos de melhoria e dicas.
- **Histórico das últimas 5 entrevistas concluídas** — só é salvo se a entrevista chegar ao fim naturalmente (cancelamento por timeout ou abandono nunca gravam nada, pois o insert só acontece na função que processa o feedback final).

### 3. Auditoria de LinkedIn (`/auditoria`)
Uma IA com persona de recrutadora sênior analisa o perfil do LinkedIn do usuário e devolve uma auditoria estruturada em abas: Resumo, Experiência, Habilidades, Educação, Melhorias e Ações.

- Entrada em **3 formatos**: texto colado, captura de tela (imagem) ou PDF exportado do próprio LinkedIn — usando os blocos multimodais `image`/`document` da API da Anthropic.
- Objetivo de análise: primeiro emprego, crescimento na carreira ou oportunidades internacionais.
- Cada "melhoria" sugerida vem com prioridade, esforço estimado, problema/solução/impacto e exemplos reais de "antes → depois" extraídos do que o usuário enviou (a IA nunca inventa conteúdo que o candidato não tem).
- **Histórico das últimas 5 análises**, com trim automático da mais antiga a cada nova análise além do limite.

### 4. Gerador de CV (`/cv`)
Uma IA especializada em recrutamento monta um currículo estruturado (JSON, não texto solto) a partir de dados reais informados pelo usuário, e gera um **PDF vetorial real** (texto selecionável, não é imagem) via `@react-pdf/renderer` — importante para passar por parsers de ATS.

- Campos obrigatórios: nome, email, objetivo, experiências, formação, habilidades. Opcionais: telefone, localização, LinkedIn, GitHub, idiomas.
- **Vaga desejada é opcional**: se informada (texto colado ou URL), a IA prioriza habilidades e alinha palavras-chave para aquela vaga específica; a URL é buscada no servidor com melhor esforço (extração de texto visível do HTML) — páginas que renderizam a descrição via JavaScript (ex: alguns portais de vagas) podem não funcionar, e o usuário recebe um erro pedindo para colar o texto manualmente.
- A IA nunca inventa empresas, cargos ou tecnologias que o usuário não informou — só reescreve e estrutura com verbos de ação e métricas reais.
- **Histórico dos últimos 5 currículos gerados**, mesmo padrão de trim das outras features.

### 5. Dashboard (`/dashboard`)
- **Score de prontidão para o mercado**: média dos scores de diagnóstico, entrevista e auditoria já feitos.
- Cards de status por feature (último score, quando foi feito).
- **Foco no ponto fraco**: competência com pior média histórica agregada entre todos os diagnósticos.
- **Changelog**: linha do tempo das últimas atividades (diagnósticos, entrevistas, auditorias).
- **Sugestões de estudo geradas por IA**, com base nos gaps encontrados no diagnóstico, entrevistas e auditoria — a IA só nomeia plataformas de estudo conhecidas, nunca inventa cursos ou URLs específicas.

## Estrutura do projeto

```
src/
├── app/
│   ├── page.tsx                    # landing page
│   ├── login/, cadastro/           # autenticação (usa AuthShell)
│   ├── dashboard/                  # dashboard agregando as 4 features
│   ├── diagnostico/                # quiz adaptativo
│   ├── entrevistas/                # simulador de entrevista (chat)
│   ├── auditoria/                  # auditoria de LinkedIn
│   ├── cv/                         # gerador de CV + PDF
│   └── api/
│       ├── diagnostico/route.ts        # gera pergunta / avalia resultado
│       ├── entrevistas/route.ts        # gera pergunta / avalia / feedback final
│       ├── auditoria/linkedin/route.ts # analisa perfil (texto/imagem/pdf)
│       ├── cv/route.ts                 # gera currículo estruturado (JSON)
│       ├── cv/pdf/route.ts             # renderiza o JSON em PDF (@react-pdf/renderer)
│       └── dashboard/cursos/route.ts   # sugestões de estudo
├── components/
│   ├── Sidebar.tsx      # nav responsiva (fixa em desktop, drawer em mobile)
│   ├── AuthShell.tsx    # layout split-screen de login/cadastro
│   └── ObjetivoSelect.tsx
├── lib/
│   ├── anthropic.ts     # client da Anthropic SDK
│   ├── diagnostico.ts   # pool de competências + lógica de priorização adaptativa
│   ├── entrevista.ts    # plano de perguntas + lógica de continuar/parar
│   ├── types.ts         # tipos compartilhados (Profile, resultados de IA, etc.)
│   ├── pdf/CurriculoDocument.tsx  # template do PDF do currículo
│   └── supabase/        # clients (browser e server)
└── proxy.ts              # middleware: protege rotas autenticadas, redireciona logado/deslogado
```

## Banco de dados (Supabase)

Sem migrations locais — o schema é gerenciado diretamente no dashboard do Supabase. Tabelas usadas pela aplicação:

| Tabela | Uso |
|---|---|
| `profiles` | dados do usuário (nome, email, área) |
| `diagnostics` | resultados de diagnóstico (`result` jsonb com categorias, gaps, recomendações) |
| `interview_sessions` | histórico de entrevistas (`messages` + `feedback` jsonb) |
| `profile_audits` | histórico de auditorias de LinkedIn (`report` jsonb) |
| `cv_generations` | histórico de currículos gerados (`curriculo` jsonb) |

Todas as tabelas de histórico seguem o mesmo padrão: RLS habilitado, políticas restringindo cada usuário às próprias linhas (`auth.uid() = user_id`), e o client mantém no máximo 5 linhas por usuário (apaga a mais antiga antes de inserir uma nova além do limite).

SQL de referência para `cv_generations` (as demais seguem o mesmo padrão):

```sql
create table public.cv_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  curriculo jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.cv_generations enable row level security;

create policy "cv_generations_select_own" on public.cv_generations
  for select using (auth.uid() = user_id);
create policy "cv_generations_insert_own" on public.cv_generations
  for insert with check (auth.uid() = user_id);
create policy "cv_generations_delete_own" on public.cv_generations
  for delete using (auth.uid() = user_id);
```

## Autenticação e proteção de rotas

`src/proxy.ts` (middleware) usa `@supabase/ssr` para ler a sessão a cada requisição:
- Usuário deslogado tentando acessar `/dashboard`, `/diagnostico`, `/entrevistas`, `/auditoria` ou `/cv` → redirecionado para `/login`.
- Usuário logado tentando acessar `/login` ou `/cadastro` → redirecionado para `/dashboard`.

## Design system

Tema escuro único ("navy-ink"), definido em `src/app/globals.css` via `@theme inline` do Tailwind v4 (sem `tailwind.config`):

- **Superfícies**: `background` `#0d1017` → `surface` `#171b24` → `surface-raised` `#1d2230`
- **Texto**: `ink` (principal), `ink-muted`, `ink-faint`
- **Acento único**: `brass` `#cb9b4c` (dourado/latão) — usado para CTAs, destaques e estado ativo
- **Semântico**: `sage` (sucesso/positivo), `rust` (erro/atenção) — nunca usados como acento decorativo
- **Tipografia**: IBM Plex Sans para texto corrido, IBM Plex Mono para tags, labels e dados numéricos

## Setup local

### Pré-requisitos
- Node.js 20+
- Um projeto Supabase (URL + anon key) com as 5 tabelas acima criadas
- Uma API key da Anthropic com créditos

### Variáveis de ambiente

Crie um `.env.local` na raiz (já está no `.gitignore`, nunca commitar):

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ANTHROPIC_API_KEY=
```

### Rodando

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Scripts disponíveis

| Comando | Descrição |
|---|---|
| `npm run dev` | servidor de desenvolvimento (Turbopack) |
| `npm run build` | build de produção |
| `npm run start` | serve o build de produção |
| `npm run lint` | ESLint |

## Deploy

O projeto é um app Next.js padrão (compatível com Vercel ou qualquer host que suporte Next.js com rotas dinâmicas/Node runtime — as rotas de API usam `@react-pdf/renderer`, que precisa de runtime Node, não Edge).

Antes de subir para produção, configure as 3 variáveis de ambiente listadas acima na plataforma de deploy (elas não vão junto no build, pois `.env.local` é ignorado no git) e garanta que as 5 tabelas do Supabase existem com RLS habilitado.
