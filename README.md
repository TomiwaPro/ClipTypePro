# ClipType Pro

Smart clipboard auto-typing SaaS. Copy text → ClipType types it character by
character into any application, simulating natural human keystrokes.

> **Status:** Step 1 — foundation scaffold. Auth, billing, snippet sync, and
> the typing engine itself are not yet wired.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` config)
- **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`) for auth + Postgres
- **Stripe** for billing (subscriptions, customer portal, webhooks)
- **Resend** for transactional email
- **Zustand** for client state, **react-hook-form** + **zod** for forms
- **Radix UI** primitives, **lucide-react** icons, **sonner** toasts
- **framer-motion** animations, **recharts** charts

> **Note:** Spec asked for Next.js 14, but `create-next-app@latest` ships
> Next.js 16 (latest stable). App Router is unchanged. If we need to
> downgrade for any specific reason, say so.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in values — see below
npm run dev                   # http://localhost:3000
```

## Environment variables

Fill these in `.env.local`. **Where each value comes from**, in the order
you'll need to create accounts:

### 1. Supabase — `https://supabase.com`
1. Sign up → **New project**
2. **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never expose)

### 2. Stripe — `https://dashboard.stripe.com`
1. Sign up (test mode is fine for development)
2. **Developers → API keys**:
   - `Publishable key` (`pk_test_…`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - `Secret key` (`sk_test_…`) → `STRIPE_SECRET_KEY`
3. **Products → + Add product** "ClipType Pro" with two recurring prices:
   - Monthly $9 → copy price ID (`price_…`) into `STRIPE_PRO_MONTHLY_PRICE_ID`
   - Annual $79 → copy price ID into `STRIPE_PRO_ANNUAL_PRICE_ID`
4. **Developers → Webhooks → + Add endpoint**:
   - URL: `https://YOUR_DOMAIN/api/stripe/webhook` (use `stripe listen` for local)
   - Events: `customer.subscription.created`, `.updated`, `.deleted`,
     `invoice.payment_succeeded`, `invoice.payment_failed`
   - After creating, copy `Signing secret` → `STRIPE_WEBHOOK_SECRET`

### 3. Resend — `https://resend.com`
1. Sign up → **API Keys → Create API Key**
2. Copy the `re_…` value → `RESEND_API_KEY`
3. Verify your sending domain under **Domains** (later, before going live).

### 4. App URL
- Local: `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- Production: set to your deployed URL (used in OAuth redirects, emails, etc.)

> **Security:** `.env.local` is gitignored (`.env*` rule). Never commit
> secrets. `NEXT_PUBLIC_*` values are bundled to the client by Next.js
> automatically — keep service-role keys and webhook secrets server-only.

## Branch strategy

Per the harness directive for this session, all development pushes go to
**`claude/cliptype-pro-production-ThoHb`**. The originally-requested
`main` / `develop` / `feature/*` model can be re-established once we
have explicit permission to push to other branches.

## Scripts

```bash
npm run dev      # Next dev server (Turbopack)
npm run build    # Production build
npm run start    # Run production build locally
npm run lint     # ESLint
```

## Supabase

The schema lives in `supabase/migrations/001_initial_schema.sql` and seed data
in `supabase/seed.sql`. **Tested end-to-end against local Postgres 16** — RLS
isolation, role-based grants, and the `auth.users` insert trigger all verified.

### Apply to a hosted Supabase project (no CLI required)

1. **Create the project** — see runbook in chat history (or re-ask Claude).
   Paste the URL + anon key + service-role key into `.env.local`.
2. **Open the SQL Editor** in your project dashboard:
   `https://supabase.com/dashboard/project/<ref>/sql/new`
3. **Run the migration**: paste the entire contents of
   `supabase/migrations/001_initial_schema.sql` → click *Run*. Should finish
   in <2 s with no errors.
4. **Run the seed**: paste `supabase/seed.sql` → *Run*. Inserts 25 rows.
5. **Verify** in *Table Editor* — you should see 9 tables, each with a
   shield icon (RLS on); `platform_ratings` should have 25 rows.

### Apply via the Supabase CLI (recommended for repeatable deploys)

```bash
npx supabase login                                  # one-time
npx supabase link --project-ref <YOUR_REF>          # found in project URL
npx supabase db push                                # applies all migrations
psql "$SUPABASE_DB_URL" -f supabase/seed.sql        # one-shot seed
```

### Generating TypeScript types

After the migration is applied, regenerate `src/types/database.ts`:

```bash
npx supabase gen types typescript --linked > src/types/database.ts
```

Re-run any time the schema changes.

## Design system

v4 tokens live in `src/app/globals.css`:

- **Tailwind utilities** (e.g. `bg-primary`, `text-text-dim`) come from the
  `@theme` block.
- **Theme-aware variables** (`var(--c-bg)`, `var(--c-surface)`, …) flip
  automatically when `<html data-theme="...">` changes. The provider in
  `src/components/theme-provider.tsx` handles persistence and toggling.

Fonts (`DM Sans`, `Space Mono`) are loaded with `next/font/google` in
`src/app/layout.tsx` and exposed as `var(--font-sans)` / `var(--font-mono)`.
