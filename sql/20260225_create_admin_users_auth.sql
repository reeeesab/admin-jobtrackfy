create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists admin_users_is_active_idx on public.admin_users (is_active);
create unique index if not exists admin_users_username_lower_uidx on public.admin_users ((lower(username)));

create or replace function public.set_admin_users_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_admin_users_updated_at();

create or replace function public.verify_admin_credentials(p_username text, p_password text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and lower(au.username) = lower(trim(p_username))
      and au.password_hash = extensions.crypt(p_password, au.password_hash)
  );
$$;

revoke all on function public.verify_admin_credentials(text, text) from public, anon, authenticated;
grant execute on function public.verify_admin_credentials(text, text) to service_role;

-- Seed one admin user (replace values before running in production):
-- insert into public.admin_users (username, password_hash)
-- values ('admin_root_x7k9', extensions.crypt('R8mN4vK2xQ7pL9tD3hF6cW1zJ5', extensions.gen_salt('bf', 12)))
-- on conflict (username) do update
-- set password_hash = excluded.password_hash, is_active = true;
