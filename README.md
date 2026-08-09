# Snip & Style — Salon Billing System

A billing & front-desk system for a unisex salon, built with Vite, React, Tailwind CSS,
React Router, and Recharts. All data (clients, bills, services, products, settings) is
stored in the browser's `localStorage` — no backend or database required, so it's free
to host and instant to deploy.

## Features

- **Login** — simple username/password gate (change it under Settings → Login credentials)
- **Dashboard** — today's & monthly revenue, 14-day revenue trend, popular services, recent bills, quick actions
- **New Bill** — search/select or add a client, pick services & products, apply discount/tax, choose payment method, generate the invoice
- **Generated bill** — print, download as PDF, or share directly on WhatsApp
- **Billing History** — search by bill no/client, filter by date range and payment method, view/print/PDF/WhatsApp any past bill
- **Clients** — directory with visit count & total spend, individual client profile with full visit history
- **Reports** — revenue trend, top clients, service performance, and payment-method mix, all filterable by date range
- **Services** — manage your service menu and pricing
- **Products** — manage retail products and stock levels, with low-stock warnings
- **Settings** — salon profile, invoice numbering/footer/tax defaults, JSON backup & restore, login credentials

## Getting started locally

```bash
npm install
npm run dev
```

Visit the printed local URL. Default login is **admin / salon123** (change this immediately
in Settings once you're live).

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New → Project** and import the repository.
3. Framework preset: **Vite** (auto-detected). Build command `npm run build`, output
   directory `dist` — Vercel fills these in automatically.
4. Deploy. `vercel.json` is already included so client-side routing (React Router)
   works correctly on refresh/direct links.

Alternatively, from the CLI:

```bash
npm i -g vercel
vercel
```

## Data & backups

Everything lives in the browser's local storage on the device it's used on. Use
**Settings → Backup & restore** regularly to export a JSON snapshot, especially before
clearing browser data or switching devices. Restoring a backup overwrites current data.

## Customizing

- Seed services/products/settings: `src/data/seed.js`
- Design tokens (colors, fonts): `tailwind.config.js`
- All pages: `src/pages/`
