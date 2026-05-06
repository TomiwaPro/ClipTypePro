-- ============================================================================
-- ClipType Pro — migration 002: profile preferences
-- ============================================================================
-- Adds three columns to profiles so user preferences persist across devices:
--   theme_preference         text     ('dark' | 'light')
--   notification_preferences jsonb    email + in-app notification toggles
--   typing_settings          jsonb    typer toggles, default speed, etc.
--
-- Defaults match the v4 prototype's initial state, so an existing user with
-- no row mutation gets the same UI as a brand-new user.
-- ============================================================================

alter table public.profiles
  add column if not exists theme_preference text not null default 'dark'
    check (theme_preference in ('dark','light')),
  add column if not exists notification_preferences jsonb not null
    default jsonb_build_object(
      'email_billing',           true,
      'email_security',          true,
      'email_product_updates',   false,
      'in_app_alerts',           true,
      'in_app_platform_warnings',true
    ),
  add column if not exists typing_settings jsonb not null
    default jsonb_build_object(
      'typo_simulation',  true,
      'pause_on_focus',   true,
      'auto_clear',       false,
      'show_wpm',         true,
      'countdown_seconds', 3,
      'default_speed',    'human',
      'human_mode',       true
    );

-- Backfill any rows created before this migration (defaults only apply to new
-- rows; ALTER ... ADD COLUMN with a non-volatile default rewrites cleanly in
-- PG 11+, but be belt-and-braces in case anything pre-existed).
update public.profiles
   set theme_preference         = coalesce(theme_preference, 'dark'),
       notification_preferences = coalesce(notification_preferences, jsonb_build_object(
         'email_billing',true,'email_security',true,'email_product_updates',false,
         'in_app_alerts',true,'in_app_platform_warnings',true
       )),
       typing_settings          = coalesce(typing_settings, jsonb_build_object(
         'typo_simulation',true,'pause_on_focus',true,'auto_clear',false,
         'show_wpm',true,'countdown_seconds',3,'default_speed','human','human_mode',true
       ))
 where theme_preference is null
    or notification_preferences is null
    or typing_settings is null;

-- ─── Composite (user_id, read) index for notifications ──────────────────────
-- We already have a partial `(user_id) WHERE NOT read` (optimal for the
-- "show unread" hot path) and a `(user_id, created_at DESC)` for the feed.
-- Adding (user_id, read) lets either-state filtered queries hit an index too.
create index if not exists notifications_user_read_idx
  on public.notifications(user_id, read);

-- ============================================================================
-- VERIFICATION (uncomment in SQL Editor to inspect):
-- ============================================================================
-- select column_name, data_type, column_default
--   from information_schema.columns
--  where table_schema='public' and table_name='profiles'
--    and column_name in ('theme_preference','notification_preferences','typing_settings')
--  order by column_name;
