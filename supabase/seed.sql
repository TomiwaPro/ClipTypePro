-- ============================================================================
-- ClipType Pro — seed data
-- ============================================================================
-- Idempotent: re-running this file is safe (uses ON CONFLICT DO UPDATE).
--
-- Apply via Supabase Dashboard SQL Editor, or:
--   supabase db reset           (dev — wipes & re-seeds)
--   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
-- ============================================================================

-- ─── PLATFORM RATINGS ────────────────────────────────────────────────────────
-- Source: 21 platforms ship verbatim from the v4 prototype. Spec asked for 25,
-- so 4 plausible extras (clearly tagged) round out the set:
--   ChatGPT, Claude.ai, Reddit, Asana
-- Remove these four if you'd rather match the prototype exactly.

insert into public.platform_ratings (name, category, risk_level, notes) values
  -- ── from v4 prototype (21) ────────────────────────────────────────────────
  ('Gmail',           'Email',      'green',  'Fully compatible'),
  ('Notion',          'Docs',       'green',  'Smooth across all blocks'),
  ('Slack',           'Chat',       'green',  'No restrictions'),
  ('VS Code',         'Dev',        'green',  'Works in editor and terminal'),
  ('Zendesk',         'Support',    'green',  'All fields supported'),
  ('Google Docs',     'Docs',       'green',  'Excellent support'),
  ('Discord',         'Chat',       'green',  'No detection'),
  ('HubSpot',         'CRM',        'green',  'Full compatibility'),
  ('Teams',           'Chat',       'yellow', 'Use Stealth in enterprise IT'),
  ('Salesforce',      'CRM',        'yellow', 'Some fields monitored'),
  ('Epic EHR',        'Healthcare', 'yellow', 'Compliance Mode required'),
  ('Jira',            'Dev',        'yellow', 'Human mode resolves issues'),
  ('Google Forms',    'Forms',      'yellow', 'Some forms flag rapid input'),
  ('Roblox',          'Gaming',     'yellow', 'Paste blocked — simulation works'),
  ('Twitter/X',       'Social',     'red',    'Active bot detection'),
  ('LinkedIn',        'Social',     'red',    'Sophisticated monitoring'),
  ('Facebook',        'Social',     'red',    'High bot sensitivity'),
  ('Stripe',          'Finance',    'red',    'Compliance Mode mandatory'),
  ('Banking Portals', 'Finance',    'red',    'Enterprise only'),
  ('Respondus LDB',   'Education',  'red',    '⛔ Auto-disabled'),
  ('ExamSoft',        'Education',  'red',    '⛔ Auto-disabled'),
  -- ── added to reach 25 (remove if you prefer 21 verbatim) ──────────────────
  ('ChatGPT',         'AI',         'yellow', 'Input field works; rapid pastes occasionally rate-limited'),
  ('Claude.ai',       'AI',         'green',  'Clipboard-friendly; works smoothly'),
  ('Reddit',          'Social',     'yellow', 'Anti-bot lighter than Twitter; Stealth recommended'),
  ('Asana',           'PM',         'green',  'Full compatibility across task fields')
on conflict (name) do update set
  category   = excluded.category,
  risk_level = excluded.risk_level,
  notes      = excluded.notes,
  updated_at = now();
