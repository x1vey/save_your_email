-- MailCheck schema + Row Level Security.
-- Apply with the Supabase CLI:  supabase db push
-- or paste into the Supabase SQL editor.
--
-- Every user-owned table has RLS ENABLED and policies that restrict each row to
-- its owner (auth.uid() = user_id). Without a matching policy, RLS denies by
-- default, so there is no way to read or write another account's rows.

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user (created automatically on signup).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  is_anonymous boolean default false,
  test_email  text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-create a profile row whenever a new auth user appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_anonymous, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.is_anonymous, false),
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- scans: a saved DNS/auth scan result, owned by the user who ran it.
-- ---------------------------------------------------------------------------
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  domain      text not null,
  score       int,
  tech_score  int,
  result      jsonb not null,
  created_at  timestamptz not null default now()
);

create index if not exists scans_user_created_idx on public.scans (user_id, created_at desc);

alter table public.scans enable row level security;

drop policy if exists "scans_select_own" on public.scans;
create policy "scans_select_own" on public.scans
  for select using (auth.uid() = user_id);

drop policy if exists "scans_insert_own" on public.scans;
create policy "scans_insert_own" on public.scans
  for insert with check (auth.uid() = user_id);

drop policy if exists "scans_delete_own" on public.scans;
create policy "scans_delete_own" on public.scans
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- reports: a generated remediation plan, owned by the user.
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  scan_id     uuid references public.scans (id) on delete set null,
  domain      text,
  sending_platform text,
  answers     jsonb,
  problem_statement text,
  triage_slots jsonb,
  markdown    text,
  final_score int,
  source      text,
  created_at  timestamptz not null default now()
);

create index if not exists reports_user_created_idx on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports
  for select using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports
  for insert with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- lead_emails: temporary storage for scanned emails before account creation
-- ---------------------------------------------------------------------------
create table if not exists public.lead_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  created_at  timestamptz not null default now()
);

alter table public.lead_emails enable row level security;

drop policy if exists "lead_emails_insert_public" on public.lead_emails;
create policy "lead_emails_insert_public" on public.lead_emails
  for insert with check (true);

drop policy if exists "lead_emails_select_public" on public.lead_emails;
create policy "lead_emails_select_public" on public.lead_emails
  for select using (true);
