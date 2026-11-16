-- Limite de uso das rotas de API por usuário, para conter o gasto com a IA.
--
-- Cada rota chama registrar_uso_api('<rota>') depois de confirmar o login
-- (src/lib/auth.ts). A função conta as chamadas do usuário naquela rota na
-- última hora e só registra uma nova se ainda houver cota.
--
-- Os limites ficam aqui, e não no código da rota: o navegador consegue
-- chamar a função direto (com o próprio JWT), então ela não pode aceitar
-- limite ou janela como parâmetro. Chamá-la direto só gasta a cota do
-- próprio usuário.

create table if not exists public.uso_api (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  rota text not null,
  criado_em timestamptz not null default now()
);

create index if not exists uso_api_user_rota_criado_idx
  on public.uso_api (user_id, rota, criado_em desc);

-- RLS ativo e nenhuma política: ninguém lê nem altera a tabela pela API.
-- Só a função abaixo (security definer) mexe nela.
alter table public.uso_api enable row level security;

create or replace function public.registrar_uso_api(p_rota text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  usuario uuid := auth.uid();
  limite integer;
  usados integer;
begin
  if usuario is null then
    return false;
  end if;

  -- Chamadas por usuário na última hora. Um diagnóstico completo usa até
  -- 21 chamadas e uma entrevista até 11.
  limite := case p_rota
    when 'diagnostico' then 60
    when 'entrevistas' then 40
    when 'auditoria' then 10
    when 'cv' then 15
    when 'cv_pdf' then 30
    when 'cursos' then 10
  end;
  if limite is null then
    raise exception 'rota desconhecida: %', p_rota;
  end if;

  -- Serializa pedidos simultâneos do mesmo usuário na mesma rota, para dois
  -- pedidos ao mesmo tempo não passarem com a última vaga.
  perform pg_advisory_xact_lock(hashtext(usuario::text || ':' || p_rota));

  delete from public.uso_api
   where user_id = usuario
     and rota = p_rota
     and criado_em < now() - interval '1 hour';

  select count(*) into usados
    from public.uso_api
   where user_id = usuario and rota = p_rota;

  if usados >= limite then
    return false;
  end if;

  insert into public.uso_api (user_id, rota) values (usuario, p_rota);
  return true;
end;
$$;

revoke all on function public.registrar_uso_api(text) from public, anon;
grant execute on function public.registrar_uso_api(text) to authenticated;
