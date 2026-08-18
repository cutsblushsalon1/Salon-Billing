# Snip & Style — Salon Billing System

A billing & front-desk system for a unisex salon, built with Vite, React, Tailwind CSS,
React Router, and Recharts. Login is real Supabase Auth, and all data (clients, bills,
services, products, settings, ...) syncs to Supabase so it's shared across devices/
browsers instead of stuck on one. **A Supabase project is required** — see setup below;
without it, nobody can log in.

## Features

- **Login** — real Supabase Auth (email/password), gates the whole app except shared invoice links
- **Dashboard** — today's & monthly revenue, 14-day revenue trend, popular services, recent bills, quick actions
- **New Bill** — search/select or add a client, pick services & products, apply discount/tax, choose payment method, generate the invoice
- **Generated bill** — print, download as PDF, or share directly on WhatsApp
- **Billing History** — search by bill no/client, filter by date range and payment method, view/print/PDF/WhatsApp any past bill
- **Clients** — directory with visit count & total spend, individual client profile with full visit history
- **Reports** — revenue trend, top clients, service performance, and payment-method mix, all filterable by date range
- **Services** — manage your service menu and pricing
- **Products** — manage retail products and stock levels, with low-stock warnings
- **Settings** — salon profile, invoice numbering/footer/tax defaults, JSON backup & restore, login credentials

## Setting up Supabase (required)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the Supabase dashboard, go to **SQL Editor → New query**, paste the contents of
   `supabase/app_state.sql`, and run it. Then do the same with `supabase/invoices.sql`
   (separate table — it's what makes shareable `/invoice/:billNo` links work without a
   login).
3. Create a login for your staff to use: **Authentication → Users → Add user**. Give it
   an email + password and tick **Auto Confirm User** (otherwise it'll wait on a
   confirmation email). Add one user per person, or just one shared one — the app doesn't
   distinguish between users, everyone signed in gets the same access.
4. Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and
   `VITE_SUPABASE_ANON_KEY` from **Project Settings → API**.
5. `npm install && npm run dev` (or redeploy, if already deployed), then sign in with the
   user you created in step 3.

Without a valid `.env`, the app still loads but nobody can sign in — the login page will
show an error explaining Supabase isn't configured yet.

## How the sync works

On first load, whatever's already in Supabase wins over anything cached locally; after
that, every change (new bill, edited client, updated settings, ...) syncs to Supabase in
the background — fire-and-forget, so the UI never waits on it, and things keep working
from the local cache if a sync call happens to fail. A local `localStorage` copy is still
kept as an offline cache/fallback, but Supabase is the source of truth once configured.

Row-level security only allows **signed-in** users to read/write `app_state` and to
insert/update `invoices` — matching the login already required to reach any of those
screens. `invoices` stays readable by anyone (even signed out) for exactly one reason:
that's what makes a shared `/invoice/:billNo` link openable by a customer who was never
asked to log in.

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New → Project** and import the repository.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output
   directory `dist` — Vercel fills these in automatically.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` under **Settings → Environment
   Variables** — without these the deployed app won't let anyone sign in.
5. Deploy. `vercel.json` is already included so client-side routing (React Router)
   works correctly on refresh/direct links.

Alternatively, from the CLI:

```bash
npm i -g vercel
vercel
```

## Data & backups

Use **Settings → Backup & restore** regularly to export a JSON snapshot, especially before
clearing browser data or switching devices. Restoring a backup overwrites current data
(and re-syncs it to Supabase).

## Customizing

- Seed services/products/settings: `src/data/seed.js`
- Design tokens (colors, fonts): `tailwind.config.js`
- All pages: `src/pages/`
