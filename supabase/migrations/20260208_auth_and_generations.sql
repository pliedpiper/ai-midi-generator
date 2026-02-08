create extension if not exists pgcrypto;

-- User OpenRouter key storage (encrypted in app layer before insert)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  openrouter_api_key_encrypted text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Saved generation history
create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  model text not null,
  attempt_index integer not null,
  prefs jsonb not null,
  composition jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_created_at_idx
  on public.generations (user_id, created_at desc);

-- Updated timestamp trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row
execute function public.set_updated_at();

alter table public.user_settings enable row level security;
alter table public.generations enable row level security;

drop policy if exists "user_settings_select_own" on public.user_settings;
create policy "user_settings_select_own"
on public.user_settings
for select
using (auth.uid() = user_id);

drop policy if exists "user_settings_insert_own" on public.user_settings;
create policy "user_settings_insert_own"
on public.user_settings
for insert
with check (auth.uid() = user_id);

drop policy if exists "user_settings_update_own" on public.user_settings;
create policy "user_settings_update_own"
on public.user_settings
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own"
on public.generations
for select
using (auth.uid() = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own"
on public.generations
for insert
with check (auth.uid() = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own"
on public.generations
for delete
using (auth.uid() = user_id);
