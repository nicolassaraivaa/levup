# LevUp

LevUp é uma plataforma de aceleração de carreira para desenvolvedores júnior/em transição, com quatro ferramentas potencializadas por IA (Claude, via API da Anthropic): diagnóstico técnico adaptativo, simulador de entrevistas, auditoria de perfil do LinkedIn e gerador de currículo em PDF.

Todas as features guardam **histórico das últimas 5 execuções** por usuário (limite aplicado por trigger no banco) e alimentam um **dashboard** com score de prontidão para o mercado, ponto fraco recorrente e sugestões de estudo geradas por IA.

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
Quiz técnico adaptativo com no mínimo **15 perguntas**, calibrado pela área (frontend, backend, full stack, mobile, dados) e nível alvo (estágio, júnior, pleno) escolhidos pelo usuário.

- O pool de competências por área vive em `src/lib/diagnostico.ts` (`CATEGORIAS`), com 16 temas cada.
- `montarPlanoCategorias()` prioriza as competências com **pior média histórica** do usuário (agregada de diagnósticos anteriores via `agregarHistoricoCategorias()`), e dá uma segunda pergunta de reforço para os pontos mais fracos (média < 45) — ou seja, o sistema aprende com o histórico e foca mais nos gaps recorrentes a cada nova tentativa.
- Perguntas e avaliação de cada resposta são geradas pela IA (`POST /api/diagnostico`).
- Resultado salvo na tabela `diagnostics` (o banco guarda os 5 últimos **por área**, que são os usados para priorizar as perguntas).

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
- **Histórico das últimas 5 análises**: o trigger `limitar_historico` apaga a mais antiga quando entra uma nova além do limite.
- A resposta da IA é validada (`src/lib/validacaoIa.ts`): se vier incompleta, cortada por `max_tokens` ou fora do formato, a rota pede de novo uma vez; listas ausentes viram listas vazias.

### 4. Gerador de CV (`/cv`)
Uma IA especializada em recrutamento monta um currículo estruturado (JSON, não texto solto) a partir de dados reais informados pelo usuário, e gera um **PDF vetorial real** (texto selecionável, não é imagem) via `@react-pdf/renderer` — importante para passar por parsers de ATS.

- Campos obrigatórios: nome, email, objetivo, experiências, formação, habilidades. Opcionais: telefone, localização, LinkedIn, GitHub, idiomas.
- **Vaga desejada é opcional**: se informada (texto colado ou URL), a IA prioriza habilidades e alinha palavras-chave para aquela vaga específica; a URL é buscada no servidor com melhor esforço (extração de texto visível do HTML) — páginas que renderizam a descrição via JavaScript (ex: alguns portais de vagas) podem não funcionar, e o usuário recebe um erro pedindo para colar o texto manualmente.
- A busca da URL passa por `src/lib/buscarUrlPublica.ts`, que bloqueia endereços internos (inclusive via DNS e redirecionamento), segue no máximo 5 redirecionamentos, corta a resposta em 2 MB e desiste após 8 s.
- A IA nunca inventa empresas, cargos ou tecnologias que o usuário não informou — só reescreve e estrutura com verbos de ação e métricas reais.
- **Histórico dos últimos 5 currículos gerados**, com o mesmo trigger de limite das outras features.

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
│   ├── configuracoes/              # editar nome e trocar senha
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
│   ├── anthropic.ts     # client da Anthropic SDK + gerarJson() (JSON com nova tentativa)
│   ├── auth.ts          # exigirUsuario(): 401 nas rotas de API sem sessão
│   ├── validacaoEntrada.ts # valida o corpo das 6 rotas de API (valores aceitos e limites)
│   ├── validacaoIa.ts   # valida e completa os JSONs da IA (auditoria e CV)
│   ├── mensagensErro.ts # erros do Supabase Auth e de rede em português
│   ├── buscarUrlPublica.ts # busca da URL da vaga com proteção contra SSRF
│   ├── diagnostico.ts   # pool de competências + lógica de priorização adaptativa
│   ├── entrevista.ts    # plano de perguntas + lógica de continuar/parar
│   ├── types.ts         # tipos compartilhados (Profile, resultados de IA, etc.)
│   ├── pdf/CurriculoDocument.tsx  # template do PDF do currículo
│   └── supabase/        # clients (browser e server)
└── proxy.ts              # middleware: protege rotas autenticadas, redireciona logado/deslogado
supabase/
└── migrations/           # schema, RLS, perfil automático e limite de histórico (ver abaixo)
```

## Banco de dados (Supabase)

Tabelas usadas pela aplicação:

| Tabela | Uso |
|---|---|
| `profiles` | dados do usuário (nome, email) |
| `diagnostics` | resultados de diagnóstico (`result` jsonb com categorias, gaps, recomendações) |
| `interview_sessions` | histórico de entrevistas (`messages` + `feedback` jsonb) |
| `profile_audits` | histórico de auditorias de LinkedIn (`report` jsonb) |
| `cv_generations` | histórico de currículos gerados (`curriculo` jsonb) |
| `uso_api` | chamadas recentes de cada usuário às rotas de API (limite de uso) |

### Migrações (`supabase/migrations/`)

São 4 arquivos, aplicados em ordem:

| Arquivo | O que faz |
|---|---|
| `20260926000000_schema_inicial.sql` | Cria as 5 tabelas e os índices, ativa RLS em todas e cria as políticas: em `profiles`, cada usuário lê, insere e altera só o próprio perfil; nas 4 tabelas de histórico, a política `linhas proprias` restringe tudo a `auth.uid() = user_id`. |
| `20260926000100_perfil_automatico.sql` | Trigger `ao_criar_usuario_criar_perfil` em `auth.users`: cria a linha em `profiles` com o nome enviado no cadastro (`options.data.name`). Também cria o perfil de quem já existia sem ele. |
| `20260926000200_limite_historico.sql` | Função `manter_ultimas_execucoes()` e trigger `limitar_historico` nas 4 tabelas de histórico: depois de cada insert, apaga o que passar de 5 registros por usuário (no diagnóstico, 5 por área). Também aplica o limite ao que já estava no banco. |
| `20261116000000_limite_uso_api.sql` | Tabela `uso_api` (RLS ativo e nenhuma política, ou seja, inacessível pela API) e função `registrar_uso_api(rota)`, chamada pelas rotas de API para limitar o uso por usuário e por hora: diagnóstico 60, entrevistas 40, auditoria 10, CV 15, PDF 30 e sugestões de estudo 10. Os limites ficam na função, então chamá-la direto do navegador só gasta a cota do próprio usuário. **Sem essa migração, as rotas de API respondem 503.** |

O limite de 5 execuções é aplicado **só pelo banco**: as páginas apenas inserem, e o trigger remove os registros mais antigos. Assim o limite vale para qualquer cliente e o histórico não é apagado se o insert falhar.

> O `schema_inicial` foi reconstruído a partir das colunas que o código usa, porque o schema original só existia no painel do Supabase. Ele é idempotente (`if not exists`) e só cria políticas numa tabela que ainda não tenha nenhuma; tipos, defaults e políticas criadas antes pelo painel podem diferir. Para conferir o banco real, rode `npx supabase db dump --schema public`.

Como aplicar:

- **Supabase CLI (projeto remoto):** `npx supabase login`, `npx supabase link --project-ref <ref-do-projeto>`, `npx supabase db push --dry-run` para ver o que será aplicado e depois `npx supabase db push`. O repositório não tem `supabase/config.toml`; se a CLI pedir, gere com `npx supabase init`.
- **Local (precisa de Docker):** `npx supabase start` e `npx supabase db reset`, que recria o banco local aplicando as migrações.
- **Sem CLI:** cole o conteúdo dos 4 arquivos, em ordem, no SQL Editor do painel do Supabase.

Para conferir depois: `select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace;`, `select * from pg_policies where schemaname = 'public';` `select tgname, tgrelid::regclass from pg_trigger where tgname in ('limitar_historico', 'ao_criar_usuario_criar_perfil');` e `select proname from pg_proc where proname = 'registrar_uso_api';`.

## Autenticação e proteção de rotas

`src/proxy.ts` (middleware) usa `@supabase/ssr` para ler a sessão a cada requisição:
- Usuário deslogado tentando acessar `/dashboard`, `/diagnostico`, `/entrevistas`, `/auditoria`, `/cv` ou `/configuracoes` → redirecionado para `/login`.
- Usuário logado tentando acessar `/login` ou `/cadastro` → redirecionado para `/dashboard`.

O proxy só redireciona páginas. Cada rota de `src/app/api/` chama `exigirUsuario()` (`src/lib/auth.ts`) antes de qualquer outra coisa: responde `401` sem sessão e `429` quando o usuário passou do limite de uso da rota na última hora (função `registrar_uso_api`, ver migrações), sem chamar a IA. Se o limite não puder ser consultado, a rota responde `503` em vez de liberar.

Depois do login, o corpo de cada rota passa por `src/lib/validacaoEntrada.ts`: área, nível, etapa, competência, tema, tipo e objetivo precisam ser valores conhecidos (nada de texto livre interpolado nos prompts), e os textos têm limite de tamanho (respostas até 4.000 caracteres, no máximo 20 respostas no diagnóstico e 10 na entrevista, perfil do LinkedIn até 20.000, arquivo até 4 MB em base64, campos do CV, até 20 dificuldades de até 300 caracteres no dashboard). Entrada inválida ou JSON malformado recebe `400` com mensagem em português, sem chamar a IA.

Contra injeção de prompt, o texto livre do candidato (respostas, perfil, currículo, vaga, dificuldades) só vai nas mensagens, nunca no prompt de sistema, e todo prompt de sistema termina com a regra `REGRA_CONTEUDO_DO_CANDIDATO` (`src/lib/anthropic.ts`), que manda tratar esse texto como dado. As perguntas geradas pela IA no diagnóstico e na entrevista vêm em JSON validado, com no máximo 800 caracteres.

As mensagens de erro do Supabase Auth (e-mail já cadastrado, senha fraca, e-mail não confirmado, limite de requisições, falha de rede...) são traduzidas por `src/lib/mensagensErro.ts`; erros desconhecidos viram um texto genérico em português.

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
- Um projeto Supabase (URL + anon key) com as 4 migrações de `supabase/migrations/` aplicadas
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
| `npm test` | testes automatizados (Vitest) |

### Testes

`npm test` roda 338 testes (Vitest, em 16 arquivos; contagem de 16/11/2026), sem rede e sem chamar a Anthropic ou o Supabase reais (os clientes são simulados):

| Arquivo | O que cobre |
|---|---|
| `src/lib/diagnostico.test.ts` | média histórica por competência e plano adaptativo do diagnóstico |
| `src/lib/entrevista.test.ts` | ordem das perguntas da entrevista e regra de continuar/encerrar |
| `src/lib/anthropic.test.ts` | `gerarJson()`: sucesso, JSON inválido seguido de sucesso, duas falhas, validação recusando, `max_tokens` |
| `src/lib/validacaoIa.test.ts` | validação e listas padrão dos JSONs da auditoria e do CV |
| `src/app/api/respostasIa.test.ts` | rotas de auditoria e CV pedindo de novo quando a IA responde incompleto |
| `src/lib/buscarUrlPublica.test.ts` | IPs e URLs bloqueados (loopback, rede privada, metadados da nuvem, IPv6...) |
| `src/lib/buscarUrlPublica.rede.test.ts` | com rede simulada: redirecionamento para IP interno, mais de 5 redirecionamentos, corte em 2 MB (inclusive gzip) |
| `src/app/api/autenticacao.test.ts` | toda rota de API responde 401 sem sessão e 429 sem cota |
| `src/lib/auth.test.ts` | `exigirUsuario()`: 401, limite de uso (429) e 503 quando o limite não pode ser consultado |
| `src/lib/validacaoEntrada.test.ts` | valores aceitos e limites de tamanho de cada rota |
| `src/app/api/entradaInvalida.test.ts` | cada rota responde 400 a entrada inválida ou JSON malformado, sem chamar a IA |
| `src/app/api/prompts.test.ts` | texto do candidato fora do prompt de sistema, regra anti-injeção em todos os prompts e pergunta da IA em JSON com tamanho máximo |
| `src/proxy.test.ts` | toda página interna redireciona para `/login` sem sessão |
| `supabase/migracoes.test.ts` | aplica as migrações num Postgres em memória: RLS em todas as tabelas, isolamento entre usuários, perfil automático, limite de 5 e limite de uso por hora |
| `src/lib/pdf/CurriculoDocument.test.ts` | o PDF do currículo tem texto extraível (compatível com ATS) |
| `src/lib/mensagensErro.test.ts` | tradução dos erros do Supabase Auth e de rede |

DevDependencies usadas só nos testes:

- `@electric-sql/pglite`: Postgres compilado para WebAssembly, em memória. Permite rodar as migrações reais e testar RLS e triggers sem Docker nem Supabase CLI.
- `unpdf`: extrai o texto do PDF gerado, para provar que o currículo não é imagem.

## Deploy

O projeto é um app Next.js padrão (compatível com Vercel ou qualquer host que suporte Next.js com rotas dinâmicas/Node runtime — as rotas de API usam `@react-pdf/renderer`, que precisa de runtime Node, não Edge).

Antes de subir para produção, configure as 3 variáveis de ambiente listadas acima na plataforma de deploy (elas não vão junto no build, pois `.env.local` é ignorado no git) e aplique as migrações de `supabase/migrations/` no projeto Supabase de produção.
