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

## Stripe billing

Subscription billing is wired through Stripe Checkout + Stripe Customer
Portal. The webhook is the source of truth — every subscription state
change is written to `profiles` from the webhook handler.

### One-time Stripe dashboard setup

#### 1. Create the account
1. Sign up at https://stripe.com (free; you don't need to "activate" the
   account to develop in test mode).
2. Make sure the **Test mode** toggle is ON (top-right of the dashboard).

#### 2. Grab API keys
**Developers → API keys**:
- `Publishable key` (`pk_test_…`) → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `Secret key` (`sk_test_…`) → `STRIPE_SECRET_KEY`

#### 3. Create the product + two recurring prices
**Product catalog → + Add product**:
- **Name**: `ClipType Pro`
- **Recurring price #1**: $9 USD / month → after creating, copy the
  `price_…` ID into `STRIPE_PRO_MONTHLY_PRICE_ID`
- **Recurring price #2**: $79 USD / year → copy ID into
  `STRIPE_PRO_ANNUAL_PRICE_ID`

#### 4. Create the three coupons + matching promotion codes
**Product catalog → Coupons → + New** for each:

| Coupon ID | Discount | Duration |
|---|---|---|
| `STAY50` | 50% off | repeating, 3 months |
| `LAUNCH30` | 30% off | once |
| `PRO50` | 50% off | once |

Then for each, **+ Promotion code** with the same string as the customer-facing
**code** (`STAY50`, `LAUNCH30`, `PRO50`). The app validates these codes via
Stripe's API — they must exist in your test-mode dashboard for the billing
page coupon input to accept them.

#### 5. Set up the webhook (different for local vs production)

**Local development — use the Stripe CLI** (recommended):
```bash
# 1) Install: https://stripe.com/docs/stripe-cli#install
# 2) Login (one-time)
stripe login

# 3) Forward events to your local server. Keep this running in a terminal
#    while you develop.
stripe listen --forward-to localhost:3000/api/stripe/webhook

# CLI prints a webhook signing secret like "whsec_xxxxx".
# Paste that into .env.local as STRIPE_WEBHOOK_SECRET, then restart the dev server.
```

**Production** — Dashboard → **Developers → Webhooks → + Add endpoint**:
- **Endpoint URL**: `https://YOUR_DOMAIN/api/stripe/webhook`
- **Events to send**: select these four:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- After creating, copy the endpoint's signing secret → set as
  `STRIPE_WEBHOOK_SECRET` in your production env (e.g. Vercel project settings).

### Test the full flow locally

In one terminal:
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

In another:
```bash
npm run dev
```

Then:
1. Sign in as a free user → visit `/dashboard/billing`
2. Click **Upgrade to Pro →** → Stripe Checkout opens
3. Pay with test card **`4242 4242 4242 4242`** (any future expiry, any CVC, any ZIP)
4. Stripe redirects to `/dashboard/billing?success=true`
5. The CLI window prints the webhook event — your handler updates the
   `profiles` row to `tier=pro`, sets `stripe_customer_id` and
   `stripe_subscription_id`
6. Refresh `/dashboard/billing` — sidebar shows "Pro Trial Active", invoice
   list populates, payment method displays last4 = 4242

### Other test cards (Stripe-provided)

| Scenario | Card |
|---|---|
| Successful payment | `4242 4242 4242 4242` |
| Card declined | `4000 0000 0000 0002` |
| Insufficient funds | `4000 0000 0000 9995` |
| Requires authentication (3DS) | `4000 0025 0000 3155` |

### Triggering webhook events manually

The Stripe CLI can replay any event for testing:
```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
stripe trigger invoice.payment_failed
```

After each trigger, check that the `profiles` row updated as expected.

### Routes ClipType exposes

| Route | Purpose |
|---|---|
| `POST /api/stripe/create-checkout-session` | starts Checkout (priceId + optional coupon) |
| `POST /api/stripe/customer-portal` | returns Stripe Customer Portal URL for self-service |
| `POST /api/stripe/validate-coupon` | looks up a Promotion Code, returns discount details |
| `POST /api/stripe/cancel-subscription` | sets `cancel_at_period_end: true` |
| `POST /api/stripe/apply-stay-discount` | attaches STAY50 to the active subscription (save offer) |
| `POST /api/stripe/webhook` | Stripe → ClipType event receiver |

## Authentication

Pages live under `src/app/(auth)/*`:

| Route | Purpose |
|---|---|
| `/login` | Email/password + Google OAuth |
| `/signup` | Account creation, ToS + academic-integrity gates |
| `/verify-email` | Post-signup hold page; 60s resend cooldown |
| `/forgot-password` | Request a reset email |
| `/reset-password` | Set a new password (requires recovery session) |
| `/auth/callback` | OAuth + email confirmation + reset-link landing |
| `/dashboard` | Auth-required placeholder (real shell ports in Step 4) |

Middleware (`src/middleware.ts`) refreshes Supabase tokens on every
request and bounces unauthenticated traffic away from `/dashboard/*`,
authenticated traffic away from `/login` + `/signup`.

### Supabase dashboard configuration (one-time)

Apply these settings in **Project Settings → Authentication** before
testing the auth flow:

#### Sign-in providers
- **Email** → enabled (default). **Confirm email** ON.
- **Google** → enable + paste OAuth client ID + secret (see below).

#### URL configuration
- **Site URL**: `http://localhost:3000`
- **Redirect URLs** — add all of these:
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/**`  (covers all post-auth landing pages)
  - production URL when you deploy

#### Email templates (Authentication → Email Templates)
Customise the three templates for ClipType Pro branding. The default
templates work; only edit if you want better-looking emails. Use these
variable substitutions Supabase exposes:
- `{{ .ConfirmationURL }}` — for confirm-signup
- `{{ .Token }}` / `{{ .TokenHash }}` — for OTP
- `{{ .Email }}`, `{{ .Data.full_name }}` — for personalisation

#### Session duration
**Authentication → Settings → Sessions**:
- **JWT expiry**: 3600 (1h access token — refreshes silently)
- **Inactivity timeout**: 604800 (7 days)
- **Time-box (max session)**: 604800 (7 days)

#### Google OAuth setup
1. https://console.cloud.google.com → **APIs & Services → Credentials → Create Credentials → OAuth client ID** (Web application)
2. **Authorized redirect URIs**: paste the exact URL Supabase shows you in **Authentication → Providers → Google** (looks like `https://<ref>.supabase.co/auth/v1/callback`)
3. Copy the **Client ID** + **Client Secret** back into Supabase's Google provider settings → save

### Manual test plan

The whole auth flow needs a live Supabase. Run through these in order
on your local machine after applying the dashboard config above:

| # | Action | Expected |
|---|---|---|
| 1 | Visit `/dashboard` while logged out | Redirects to `/login?next=/dashboard` |
| 2 | `/login` — submit empty form | Inline errors on email + password, no network call |
| 3 | `/login` — wrong password | "Incorrect email or password." inline |
| 4 | `/login` — unverified account | "Please verify your email…" inline |
| 5 | `/signup` — weak password (e.g. "abc") | Strength meter red "Weak"; submit disabled |
| 6 | `/signup` — strong password but ToS unchecked | Submit disabled |
| 7 | `/signup` — all valid | Redirects to `/verify-email?email=…` |
| 8 | `/verify-email` — click Resend | Disables for 60s with countdown; new email arrives |
| 9 | Click confirmation link in email | Lands at `/dashboard` signed in |
| 10 | While signed in, visit `/login` | Bounces to `/dashboard` |
| 11 | Sign out from `/dashboard` | Lands on `/login` |
| 12 | `/forgot-password` — submit email | Success card "Check your inbox" |
| 13 | Click reset link in email | Lands at `/reset-password` |
| 14 | `/reset-password` — mismatched passwords | Inline "Passwords don't match" |
| 15 | `/reset-password` — set new password | Redirects to `/login?reset=success` with green banner |
| 16 | Sign in with new password | Lands on `/dashboard` |
| 17 | `/login` — click "Continue with Google" | Redirects to Google's consent screen |

If any step misbehaves, paste the URL bar + the error displayed and we'll
debug.

### Why isn't the verification email arriving?

Most common reasons, in order:

1. **Spam / Promotions tab.** Supabase emails come from `noreply@mail.app.supabase.io` until you set up a custom domain — Gmail and Outlook frequently quarantine them.
2. **Free-tier rate limit hit.** Supabase's shared SMTP allows ~3 emails/hour per project. After ~3 signups/resets/resends, the next ones silently get the `over_request_rate_limit` error code (the resend button on `/verify-email` will show *"Project email rate limit reached…"* with a 1-hour cooldown). Wait an hour, or set up a custom SMTP — see below.
3. **Confirm-email setting off.** Supabase dashboard → **Authentication → Providers → Email** — verify *"Confirm email"* is ON. If it's off, signups become "instantly active" and no email is sent.
4. **Email address typo.** No verification → signup row exists but unconfirmed. Cure: drop the user from **Authentication → Users**, sign up again with the correct address.
5. **Look at the source of truth.** Dashboard → **Authentication → Logs**. Every send (success or rate-limited) is logged here. If you see no entry for your email, the request never reached Supabase — likely a frontend / network issue.

### Custom SMTP via Resend (kills the rate limit)

You already have a Resend API key in `.env.local`. Wire it up:

1. **Resend dashboard → Domains → Add Domain** → add a domain you own (e.g. `cliptypepro.com`). Add the DNS records Resend shows you (SPF + DKIM + DMARC) at your registrar. Wait for "Verified".
2. **Supabase dashboard → Project Settings → Auth → SMTP Settings → Enable Custom SMTP**, then fill in:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (STARTTLS)
   - Username: `resend`
   - Password: your Resend API key (`re_…`)
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `ClipType Pro`
3. Save and send a test email from Supabase. Once that works, the 3/hour cap is gone.

> Until your domain is verified in Resend, you can use Resend's onboarding sandbox sender — but it only delivers to **your** address (the email you signed up to Resend with), which is fine for testing.

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

### Connectivity check

After filling in `.env.local` and applying both migrations, hit:

```
GET /api/health
```

A healthy response returns HTTP 200 and:

```json
{
  "ok": true,
  "stage": "connected",
  "platform_ratings_count": 25,
  "expected": 25,
  "authenticated": false,
  "user_id": null
}
```

Any other shape (`stage: "env"` / `"client"` / `"query"`) tells you exactly
where setup is broken.

### Supabase clients

| File | Use from | Auth | RLS |
|---|---|---|---|
| `src/lib/supabase/server.ts` | Server Components, Route Handlers, Server Actions | user JWT (via cookies) | applies |
| `src/lib/supabase/browser.ts` | Client Components | user JWT (via cookies) | applies |
| `src/lib/supabase/admin.ts` | Webhooks, cron, trusted server work only | service role | **bypassed** |

The admin client is `import "server-only"`-guarded and will refuse to be
imported into a client bundle.

## Design system

v4 tokens live in `src/app/globals.css`:

- **Tailwind utilities** (e.g. `bg-primary`, `text-text-dim`) come from the
  `@theme` block.
- **Theme-aware variables** (`var(--c-bg)`, `var(--c-surface)`, …) flip
  automatically when `<html data-theme="...">` changes. The provider in
  `src/components/theme-provider.tsx` handles persistence and toggling.

Fonts (`DM Sans`, `Space Mono`) are loaded with `next/font/google` in
`src/app/layout.tsx` and exposed as `var(--font-sans)` / `var(--font-mono)`.
