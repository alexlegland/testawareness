-- FinOps Academy — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query → Run

-- ── Prerequisites ─────────────────────────────────────────────────────────────
-- In Authentication → Providers → Email:
--   Disable "Confirm email" so users can log in immediately after signup.

-- ── Tables ────────────────────────────────────────────────────────────────────

create table if not exists organisations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  owner_id   uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null,
  role        text,        -- 'owner' | track key (pm, developer, devops, cto, finance, architect)
  track       text,        -- null for org owners
  org_id      uuid references organisations(id) on delete cascade,
  is_owner    boolean default false,
  last_active timestamptz default now(),
  created_at  timestamptz default now()
);

create table if not exists invites (
  id         uuid primary key default gen_random_uuid(),
  token      text unique not null,
  org_id     uuid references organisations(id) on delete cascade,
  track      text not null,
  created_at timestamptz default now(),
  used       boolean default false,
  used_by    uuid references auth.users(id)
);

create table if not exists progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  module_id    text not null,
  score        integer not null default 0,
  max_score    integer not null default 0,
  completed_at timestamptz default now(),
  unique (user_id, module_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists profiles_org_id_idx  on profiles(org_id);
create index if not exists invites_token_idx    on invites(token);
create index if not exists invites_org_id_idx   on invites(org_id);
create index if not exists progress_user_id_idx on progress(user_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table organisations enable row level security;
alter table profiles      enable row level security;
alter table invites       enable row level security;
alter table progress      enable row level security;

-- organisations: members can read their own org; anyone can insert (owner signup)
create policy "Org members can read org" on organisations
  for select using (
    id in (select org_id from profiles where id = auth.uid())
  );
create policy "Anyone can create org" on organisations
  for insert with check (true);

-- profiles: own row full access; org owners can read all member rows
create policy "Users can read own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles
  for insert with check (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);
create policy "Owners can read org profiles" on profiles
  for select using (
    org_id in (select id from organisations where owner_id = auth.uid())
  );

-- invites: public read (token is a secret); owners can insert; authenticated users can update (mark used)
create policy "Public invite read" on invites
  for select using (true);
create policy "Owners can create invites" on invites
  for insert with check (
    org_id in (select id from organisations where owner_id = auth.uid())
  );
create policy "Authenticated users can update invites" on invites
  for update using (auth.uid() is not null);

-- progress: own rows full access; org owners can read team progress
create policy "Users can read own progress" on progress
  for select using (auth.uid() = user_id);
create policy "Users can insert own progress" on progress
  for insert with check (auth.uid() = user_id);
create policy "Users can update own progress" on progress
  for update using (auth.uid() = user_id);
create policy "Owners can read team progress" on progress
  for select using (
    user_id in (
      select p.id from profiles p
      where p.org_id in (
        select id from organisations where owner_id = auth.uid()
      )
    )
  );
