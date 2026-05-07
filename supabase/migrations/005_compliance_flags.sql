-- ============================================================================
-- ClipType Pro — migration 005: profile compliance flags
-- ============================================================================
-- Three booleans on profiles for the /dashboard/compliance toggles. Stored
-- as separate columns (rather than JSONB) so we can index / filter / report
-- on each one cheaply.
--
--   compliance_mode      master switch — gates audit-log retention, SSO
--                        enforcement, etc. (UI only for now)
--   hipaa_baa_accepted   user clicked through the HIPAA Business Associate
--                        Agreement modal
--   gdpr_dpa_accepted    user clicked through the GDPR Data Processing
--                        Addendum modal
--
-- All default false; existing rows are backfilled implicitly via the
-- NOT NULL DEFAULT FALSE on add.
-- ============================================================================

alter table public.profiles
  add column if not exists compliance_mode boolean not null default false,
  add column if not exists hipaa_baa_accepted boolean not null default false,
  add column if not exists gdpr_dpa_accepted boolean not null default false;
