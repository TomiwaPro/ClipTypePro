-- ============================================================================
-- ClipType Pro — initial schema (001)
-- ============================================================================
-- Tables:  profiles, teams, team_members, snippets, typing_sessions,
--          platform_ratings, notifications, referrals, api_keys
-- RLS:     Enabled on every table.
-- Triggers: auto-create profile on auth.users insert; touch updated_at.
-- ============================================================================

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";  -- gen_random_uuid()
create extension if not exists "citext";    -- case-insensitive emails

-- ─── Generic helper: auto-touch updated_at on UPDATE ─────────────────────────
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- TEAMS  (created first so other tables can reference)
-- ============================================================================
create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  plan        text not null default 'teams'
              check (plan in ('teams','enterprise')),
  seat_count  int  not null default 1 check (seat_count >= 1),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index teams_owner_id_idx on public.teams(owner_id);
create trigger teams_set_updated_at
  before update on public.teams
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- PROFILES  (1:1 with auth.users)
-- ============================================================================
create table public.profiles (
  id                       uuid primary key
                           references auth.users(id) on delete cascade,
  email                    citext not null unique,
  full_name                text,
  avatar_url               text,
  tier                     text not null default 'free'
                           check (tier in ('free','pro','teams','enterprise')),
  stripe_customer_id       text unique,
  stripe_subscription_id   text unique,
  subscription_status      text
                           check (subscription_status in (
                             'trialing','active','past_due','canceled',
                             'incomplete','incomplete_expired','unpaid','paused'
                           )),
  trial_ends_at            timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index profiles_stripe_customer_id_idx on public.profiles(stripe_customer_id);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Auto-create a profile + 14-day Pro trial whenever a new auth.users row appears.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name'
    ),
    new.raw_user_meta_data->>'avatar_url',
    now() + interval '14 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- TEAM MEMBERS
-- ============================================================================
create table public.team_members (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  user_id       uuid references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin','member','viewer')),
  invited_email citext,
  status        text not null default 'invited'
                check (status in ('active','invited')),
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  -- Either a real user or an invited email must be present.
  constraint team_members_target_check
    check (user_id is not null or invited_email is not null),
  -- One active membership per (team, user).
  constraint team_members_team_user_unique unique (team_id, user_id)
);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);

-- ─── Membership helpers (SECURITY DEFINER to avoid RLS recursion) ───────────
-- When team_members RLS calls these helpers, they must bypass team_members RLS
-- to prevent infinite recursion. SECURITY DEFINER + bounded search_path is the
-- canonical Supabase pattern for this.
create or replace function public.is_team_member(_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.team_members
     where team_id = _team_id
       and user_id = auth.uid()
       and status  = 'active'
  );
$$;

create or replace function public.is_team_admin(_team_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
      from public.team_members
     where team_id = _team_id
       and user_id = auth.uid()
       and status  = 'active'
       and role    = 'admin'
  )
  or exists (
    select 1 from public.teams
     where id = _team_id and owner_id = auth.uid()
  );
$$;

-- ============================================================================
-- SNIPPETS  (private by default; sharable to a team when is_shared=true)
-- ============================================================================
create table public.snippets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  team_id     uuid references public.teams(id) on delete set null,
  title       text not null,
  category    text not null default 'General',
  content     text not null,
  use_count   int  not null default 0 check (use_count >= 0),
  is_shared   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- A shared snippet must belong to a team.
  constraint snippets_shared_requires_team
    check (not is_shared or team_id is not null)
);
create index snippets_user_id_idx on public.snippets(user_id);
create index snippets_team_id_idx on public.snippets(team_id) where is_shared;
create trigger snippets_set_updated_at
  before update on public.snippets
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- TYPING SESSIONS  (immutable analytics records)
-- ============================================================================
create table public.typing_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  char_count       int  not null check (char_count >= 0),
  word_count       int  not null check (word_count >= 0),
  avg_wpm          int  not null check (avg_wpm >= 0),
  speed_mode       text not null
                   check (speed_mode in ('stealth','human','balanced','fast','instant')),
  target_app       text,
  duration_seconds int  not null check (duration_seconds >= 0),
  created_at       timestamptz not null default now()
);
create index typing_sessions_user_id_idx
  on public.typing_sessions(user_id, created_at desc);

-- ============================================================================
-- PLATFORM RATINGS  (public reference data; writes via service_role only)
-- ============================================================================
create table public.platform_ratings (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text not null,
  risk_level  text not null check (risk_level in ('green','yellow','red')),
  notes       text,
  updated_at  timestamptz not null default now()
);
create trigger platform_ratings_set_updated_at
  before update on public.platform_ratings
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null check (type in ('alert','billing','system','team')),
  title      text not null,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_id_created_idx
  on public.notifications(user_id, created_at desc);
create index notifications_unread_idx
  on public.notifications(user_id) where not read;

-- ============================================================================
-- REFERRALS
-- ============================================================================
create table public.referrals (
  id                uuid primary key default gen_random_uuid(),
  referrer_id       uuid not null references auth.users(id) on delete cascade,
  referred_email    citext not null,
  referred_user_id  uuid references auth.users(id) on delete set null,
  status            text not null default 'pending'
                    check (status in ('pending','signed_up','converted')),
  earned_months     int  not null default 0 check (earned_months >= 0),
  created_at        timestamptz not null default now(),
  unique (referrer_id, referred_email)
);
create index referrals_referrer_id_idx on public.referrals(referrer_id);

-- ============================================================================
-- API KEYS  (stored as a hash; plaintext only ever shown once at creation)
-- ============================================================================
create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  key_hash     text not null unique,        -- sha-256 of the plaintext key
  key_prefix   text not null,                -- e.g. "ctp_live_sk_a1b2" (display only)
  label        text,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index api_keys_user_id_idx on public.api_keys(user_id);
create index api_keys_active_hash_idx
  on public.api_keys(key_hash) where revoked_at is null;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
-- Notes on the threat model:
-- 1. `auth.uid()` returns null for anon callers and the user UUID for logged-in
--    callers — every policy below explicitly checks ownership against it.
-- 2. The Supabase `service_role` key bypasses RLS entirely and is only ever
--    used by trusted server code (Stripe webhooks, cron, admin tooling).
-- 3. The `anon` role gets no policies → reads/writes denied by default.
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.teams             enable row level security;
alter table public.team_members      enable row level security;
alter table public.snippets          enable row level security;
alter table public.typing_sessions   enable row level security;
alter table public.platform_ratings  enable row level security;
alter table public.notifications     enable row level security;
alter table public.referrals         enable row level security;
alter table public.api_keys          enable row level security;

-- ── Base privileges ──────────────────────────────────────────────────────────
-- IMPORTANT: enabling RLS only filters rows. Base GRANTs still control whether
-- a role can run SELECT/INSERT/UPDATE/DELETE at all. Without these, even an
-- authenticated user with a passing RLS policy gets "permission denied".
-- (Hosted Supabase ships default privileges that cover this implicitly, but
-- being explicit means the migration also runs cleanly on a vanilla Postgres
-- and is auditable.)

grant usage on schema public to anon, authenticated, service_role;

-- anon: nothing. (Lock down everything by default.)
revoke all on public.profiles, public.teams, public.team_members,
              public.snippets, public.typing_sessions, public.platform_ratings,
              public.notifications, public.referrals, public.api_keys
  from anon;

-- authenticated: full DML — RLS narrows what they can actually touch.
grant select, insert, update, delete on
  public.profiles, public.teams, public.team_members,
  public.snippets, public.typing_sessions, public.notifications,
  public.referrals, public.api_keys
  to authenticated;

-- platform_ratings: read-only for users; writes via service_role only.
grant select on public.platform_ratings to authenticated;

-- service_role: full access on every table (webhooks, cron, admin tooling).
-- Combined with `bypassrls` on the role, this lets webhooks update Stripe
-- state, insert system notifications, etc., regardless of policy.
grant all on
  public.profiles, public.teams, public.team_members,
  public.snippets, public.typing_sessions, public.platform_ratings,
  public.notifications, public.referrals, public.api_keys
  to service_role;

-- Helper functions used inside RLS predicates.
grant execute on function public.is_team_member(uuid) to authenticated, service_role;
grant execute on function public.is_team_admin(uuid)  to authenticated, service_role;

-- ─── PROFILES ────────────────────────────────────────────────────────────────
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT goes through handle_new_user() trigger (security definer).
-- DELETE cascades from auth.users; not directly allowed.

-- ─── TEAMS ───────────────────────────────────────────────────────────────────
create policy "teams_select_member_or_owner"
  on public.teams for select to authenticated
  using (
    auth.uid() = owner_id
    or public.is_team_member(id)
  );

create policy "teams_insert_self_as_owner"
  on public.teams for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "teams_update_owner"
  on public.teams for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "teams_delete_owner"
  on public.teams for delete to authenticated
  using (auth.uid() = owner_id);

-- ─── TEAM MEMBERS ────────────────────────────────────────────────────────────
create policy "team_members_select_same_team"
  on public.team_members for select to authenticated
  using (
    public.is_team_member(team_id)
    or exists (
      select 1 from public.teams t
       where t.id = team_id and t.owner_id = auth.uid()
    )
    or user_id = auth.uid()  -- always see your own row, even before activation
  );

create policy "team_members_insert_admin"
  on public.team_members for insert to authenticated
  with check (public.is_team_admin(team_id));

create policy "team_members_update_admin_or_self"
  on public.team_members for update to authenticated
  using (
    public.is_team_admin(team_id)
    or user_id = auth.uid()
  )
  with check (
    public.is_team_admin(team_id)
    or user_id = auth.uid()
  );

create policy "team_members_delete_admin_or_self"
  on public.team_members for delete to authenticated
  using (
    public.is_team_admin(team_id)
    or user_id = auth.uid()
  );

-- ─── SNIPPETS ────────────────────────────────────────────────────────────────
create policy "snippets_select_own_or_shared_team"
  on public.snippets for select to authenticated
  using (
    user_id = auth.uid()
    or (is_shared and team_id is not null and public.is_team_member(team_id))
  );

create policy "snippets_insert_own"
  on public.snippets for insert to authenticated
  with check (user_id = auth.uid());

create policy "snippets_update_own"
  on public.snippets for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "snippets_delete_own"
  on public.snippets for delete to authenticated
  using (user_id = auth.uid());

-- ─── TYPING SESSIONS ─────────────────────────────────────────────────────────
create policy "typing_sessions_select_own"
  on public.typing_sessions for select to authenticated
  using (user_id = auth.uid());

create policy "typing_sessions_insert_own"
  on public.typing_sessions for insert to authenticated
  with check (user_id = auth.uid());

create policy "typing_sessions_delete_own"
  on public.typing_sessions for delete to authenticated
  using (user_id = auth.uid());

-- (no UPDATE — analytics rows are immutable)

-- ─── PLATFORM RATINGS ────────────────────────────────────────────────────────
create policy "platform_ratings_select_authenticated"
  on public.platform_ratings for select to authenticated
  using (true);

-- INSERT/UPDATE/DELETE: service_role only (RLS bypass is automatic).

-- ─── NOTIFICATIONS ───────────────────────────────────────────────────────────
create policy "notifications_select_own"
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications_delete_own"
  on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- INSERT: service_role only (system-generated notifications).

-- ─── REFERRALS ───────────────────────────────────────────────────────────────
create policy "referrals_select_own"
  on public.referrals for select to authenticated
  using (referrer_id = auth.uid());

create policy "referrals_insert_own"
  on public.referrals for insert to authenticated
  with check (referrer_id = auth.uid());

-- UPDATE/DELETE: service_role only (status flips on conversion).

-- ─── API KEYS ────────────────────────────────────────────────────────────────
create policy "api_keys_select_own"
  on public.api_keys for select to authenticated
  using (user_id = auth.uid());

create policy "api_keys_insert_own"
  on public.api_keys for insert to authenticated
  with check (user_id = auth.uid());

create policy "api_keys_update_own"
  on public.api_keys for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "api_keys_delete_own"
  on public.api_keys for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION  (run after migrating; should return one row per table with
--                rls_enabled=true and policy_count>0 for non-public tables)
-- ============================================================================
-- select c.relname                      as table_name,
--        c.relrowsecurity                as rls_enabled,
--        (select count(*)
--           from pg_policies p
--          where p.schemaname='public' and p.tablename=c.relname) as policy_count
--   from pg_class c
--   join pg_namespace n on n.oid=c.relnamespace
--  where n.nspname='public' and c.relkind='r'
--  order by c.relname;
