-- Schema base do LevUp.
--
-- ATENÇÃO: este arquivo foi reconstruído a partir das colunas que o código
-- lê e grava, porque o schema original só existia no painel do Supabase.
-- Tipos e defaults podem diferir do banco em produção. Para ter a versão
-- exata, rode `supabase db dump --schema public` no projeto e substitua o
-- conteúdo deste arquivo pelo resultado.
--
-- É idempotente (if not exists), então não altera tabelas que já existem.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.diagnostics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area text not null,
  score integer,
  gaps jsonb,
  result jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text,
  language text,
  messages jsonb,
  feedback jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  linkedin_url text,
  github_url text,
  cv_text text,
  report jsonb,
  score integer,
  created_at timestamptz not null default now()
);

create table if not exists public.cv_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  curriculo jsonb,
  created_at timestamptz not null default now()
);

create index if not exists diagnostics_user_area_created_idx
  on public.diagnostics (user_id, area, created_at desc);
create index if not exists interview_sessions_user_created_idx
  on public.interview_sessions (user_id, created_at desc);
create index if not exists profile_audits_user_created_idx
  on public.profile_audits (user_id, created_at desc);
create index if not exists cv_generations_user_created_idx
  on public.cv_generations (user_id, created_at desc);

-- RLS: cada usuário só enxerga e altera as próprias linhas.
alter table public.profiles enable row level security;
alter table public.diagnostics enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.profile_audits enable row level security;
alter table public.cv_generations enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles') then
    create policy "perfil proprio: leitura" on public.profiles
      for select using ((select auth.uid()) = id);
    create policy "perfil proprio: insercao" on public.profiles
      for insert with check ((select auth.uid()) = id);
    create policy "perfil proprio: atualizacao" on public.profiles
      for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
  end if;
end $$;

do $$
declare
  tabela text;
begin
  foreach tabela in array array['diagnostics', 'interview_sessions', 'profile_audits', 'cv_generations'] loop
    if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = tabela) then
      execute format(
        'create policy "linhas proprias" on public.%I for all
           using ((select auth.uid()) = user_id)
           with check ((select auth.uid()) = user_id)',
        tabela
      );
    end if;
  end loop;
end $$;
