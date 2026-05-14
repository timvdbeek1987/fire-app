-- ============================================================
-- FIRE App — database schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New Query)
-- ============================================================

-- 1. user_profiles
create table if not exists public.user_profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  geboortejaar       int,
  pensioen_leeftijd  int,
  user_type          text check (user_type in ('dga', 'prive')),
  onboarding_completed boolean default false,
  updated_at         timestamptz default now()
);

alter table public.user_profiles enable row level security;

drop policy if exists "Eigen profiel lezen"    on public.user_profiles;
drop policy if exists "Eigen profiel schrijven" on public.user_profiles;
drop policy if exists "Eigen profiel updaten"  on public.user_profiles;

create policy "Eigen profiel lezen"
  on public.user_profiles for select
  using (auth.uid() = user_id);

create policy "Eigen profiel schrijven"
  on public.user_profiles for insert
  with check (auth.uid() = user_id);

create policy "Eigen profiel updaten"
  on public.user_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. fire_data
create table if not exists public.fire_data (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  params     jsonb    default '{}'::jsonb,
  pk_cache   jsonb,
  updated_at timestamptz default now()
);

alter table public.fire_data enable row level security;

drop policy if exists "Eigen fire_data lezen"    on public.fire_data;
drop policy if exists "Eigen fire_data schrijven" on public.fire_data;
drop policy if exists "Eigen fire_data updaten"  on public.fire_data;

create policy "Eigen fire_data lezen"
  on public.fire_data for select
  using (auth.uid() = user_id);

create policy "Eigen fire_data schrijven"
  on public.fire_data for insert
  with check (auth.uid() = user_id);

create policy "Eigen fire_data updaten"
  on public.fire_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. voortgang
create table if not exists public.voortgang (
  id           text not null,
  user_id      uuid not null references auth.users(id) on delete cascade,
  datum        date not null,
  bv           numeric default 0,
  prive        numeric default 0,
  inleg_bv     numeric default 0,
  bv_spaar     numeric default 0,
  prive_spaar  numeric default 0,
  notitie      text,
  updated_at   timestamptz default now(),
  created_at   timestamptz default now(),
  primary key (id)
);

alter table public.voortgang enable row level security;

drop policy if exists "Eigen voortgang lezen"      on public.voortgang;
drop policy if exists "Eigen voortgang schrijven"  on public.voortgang;
drop policy if exists "Eigen voortgang updaten"    on public.voortgang;
drop policy if exists "Eigen voortgang verwijderen" on public.voortgang;

create policy "Eigen voortgang lezen"
  on public.voortgang for select
  using (auth.uid() = user_id);

create policy "Eigen voortgang schrijven"
  on public.voortgang for insert
  with check (auth.uid() = user_id);

create policy "Eigen voortgang updaten"
  on public.voortgang for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Eigen voortgang verwijderen"
  on public.voortgang for delete
  using (auth.uid() = user_id);

-- ============================================================
-- GRANT — vereist voor toegang via supabase-js (authenticated rol)
-- Tabellen aangemaakt via SQL Editor krijgen dit niet automatisch
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_profiles to authenticated;
grant select, insert, update, delete on public.fire_data      to authenticated;
grant select, insert, update, delete on public.voortgang      to authenticated;
