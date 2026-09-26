-- Mantém só as últimas 5 execuções de cada funcionalidade por usuário.
--
-- Antes o limite era aplicado pelo navegador (e o diagnóstico nem aplicava),
-- o que não garante nada. Aqui ele vale para qualquer insert.
-- O diagnóstico guarda 5 por área, porque a página usa os 5 últimos
-- diagnósticos da mesma área para priorizar as perguntas.
--
-- Argumentos do trigger: limite e, opcionalmente, uma coluna extra que
-- separa os grupos (ex.: 'area').

create or replace function public.manter_ultimas_execucoes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  limite integer := tg_argv[0]::integer;
  coluna_grupo text := tg_argv[1];
begin
  if coluna_grupo is null then
    execute format(
      'delete from %1$I.%2$I
        where user_id = $1
          and id not in (
            select id from %1$I.%2$I
             where user_id = $1
             order by created_at desc, id desc
             limit $2)',
      tg_table_schema, tg_table_name
    ) using new.user_id, limite;
  else
    execute format(
      'delete from %1$I.%2$I
        where user_id = $1 and %3$I::text = $3
          and id not in (
            select id from %1$I.%2$I
             where user_id = $1 and %3$I::text = $3
             order by created_at desc, id desc
             limit $2)',
      tg_table_schema, tg_table_name, coluna_grupo
    ) using new.user_id, limite, to_jsonb(new) ->> coluna_grupo;
  end if;
  return null;
end;
$$;

drop trigger if exists limitar_historico on public.diagnostics;
create trigger limitar_historico
  after insert on public.diagnostics
  for each row execute function public.manter_ultimas_execucoes(5, 'area');

drop trigger if exists limitar_historico on public.interview_sessions;
create trigger limitar_historico
  after insert on public.interview_sessions
  for each row execute function public.manter_ultimas_execucoes(5);

drop trigger if exists limitar_historico on public.profile_audits;
create trigger limitar_historico
  after insert on public.profile_audits
  for each row execute function public.manter_ultimas_execucoes(5);

drop trigger if exists limitar_historico on public.cv_generations;
create trigger limitar_historico
  after insert on public.cv_generations
  for each row execute function public.manter_ultimas_execucoes(5);

-- Aplica o limite ao que já está no banco.
delete from public.diagnostics d
using (
  select id, row_number() over (partition by user_id, area order by created_at desc, id desc) as n
  from public.diagnostics
) r
where d.id = r.id and r.n > 5;

delete from public.interview_sessions t
using (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as n
  from public.interview_sessions
) r
where t.id = r.id and r.n > 5;

delete from public.profile_audits t
using (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as n
  from public.profile_audits
) r
where t.id = r.id and r.n > 5;

delete from public.cv_generations t
using (
  select id, row_number() over (partition by user_id order by created_at desc, id desc) as n
  from public.cv_generations
) r
where t.id = r.id and r.n > 5;
