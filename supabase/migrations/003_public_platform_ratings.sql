-- ============================================================================
-- ClipType Pro — migration 003: open platform_ratings to anon reads
-- ============================================================================
-- platform_ratings is public reference data — which third-party platforms are
-- bot-friendly, contain no PII or user data, and the marketing site may want
-- to render a teaser. Migration 001 over-restricted it to authenticated only,
-- which also breaks the /api/health probe.
--
-- This migration:
--   1. GRANTs SELECT on platform_ratings to the anon role
--   2. Replaces the authenticated-only RLS policy with one that allows both
--      anon and authenticated readers
-- Writes (INSERT/UPDATE/DELETE) remain service_role only.
-- ============================================================================

-- 1. Base privilege
grant select on public.platform_ratings to anon;

-- 2. Replace policy: drop the auth-only one, create a public-read one
drop policy if exists "platform_ratings_select_authenticated" on public.platform_ratings;
drop policy if exists "platform_ratings_select_public" on public.platform_ratings;

create policy "platform_ratings_select_public"
  on public.platform_ratings for select
  to anon, authenticated
  using (true);

-- ============================================================================
-- VERIFICATION (run after migrating):
--   select count(*) from public.platform_ratings;
--   -- as anon role: should also work; should return 25
-- ============================================================================
