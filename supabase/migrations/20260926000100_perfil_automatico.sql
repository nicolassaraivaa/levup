-- Cria o perfil no próprio banco assim que o usuário é criado no Auth.
--
-- Antes, o insert em `profiles` era feito pelo navegador logo depois do
-- signUp. Com confirmação de e-mail ativa ainda não há sessão nesse momento,
-- o RLS barra o insert e o usuário ficava sem perfil. O trigger roda como
-- dono da função (security definer), então não depende de sessão.
-- O nome vem de `options.data.name`, enviado no signUp pela página de cadastro.

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email)
  values (new.id, new.raw_user_meta_data ->> 'name', new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ao_criar_usuario_criar_perfil on auth.users;
create trigger ao_criar_usuario_criar_perfil
  after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Corrige quem já ficou sem perfil.
insert into public.profiles (id, name, email)
select u.id, u.raw_user_meta_data ->> 'name', u.email
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
