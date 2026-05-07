-- ============================================================================
-- ClipType Pro — migration 004: email sync trigger + referral codes
-- ============================================================================
-- 1. Sync auth.users.email → profiles.email automatically.
--    Without this, profiles.email goes stale after a confirmed email change
--    until a separate reconciliation pass runs (e.g. on Settings page load).
--
-- 2. Per-user referral_code on profiles. Short, URL-safe, unique. Backfill
--    existing rows; new rows get a default at insert time.
-- ============================================================================

-- ─── 1. Email sync trigger ───────────────────────────────────────────────
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set email = new.email
   where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_profile_email_after_auth_update on auth.users;
create trigger sync_profile_email_after_auth_update
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sync_profile_email();

-- ─── 2. Referral codes ───────────────────────────────────────────────────
-- 12 lowercase hex chars: 16^12 ≈ 2.8 × 10^14 keys, collision risk
-- effectively zero. Unique constraint catches the impossible-but-not-zero
-- case; application code retries on the rare 23505 error.

alter table public.profiles
  add column if not exists referral_code text;

-- Backfill: any pre-existing row gets a fresh code.
update public.profiles
   set referral_code = lower(
     substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
   )
 where referral_code is null;

alter table public.profiles
  alter column referral_code set not null,
  alter column referral_code set default lower(
    substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12)
  );

create unique index if not exists profiles_referral_code_uidx
  on public.profiles(referral_code);

-- ============================================================================
-- VERIFICATION (uncomment in SQL Editor):
-- ============================================================================
-- select id, email, referral_code from public.profiles limit 5;
-- select pg_get_triggerdef(oid) from pg_trigger
--  where tgname = 'sync_profile_email_after_auth_update';
