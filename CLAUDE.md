# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Deploy Commands

**IMPORTANT: Two build steps required before deploy.**

```bash
# 1. Build Next.js
npm run build

# 2. Transform for Cloudflare Workers (generates .open-next/worker.js)
npx opennextjs-cloudflare build

# 3. Deploy
npx wrangler deploy
```

`npm run build` alone does NOT update the deployed Worker — you must run `opennextjs-cloudflare build` after it.

Local dev: `npx wrangler dev` (uses local D1 simulation).

## Architecture

Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui, deployed as a Cloudflare Worker via OpenNext.

- **Worker name:** `capstone-crm`
- **Live URL:** `crm.capstoneconsulting.com.sg`
- **D1 database:** `capstone-crm-db` (ID: `de61bc98-055d-4824-ab2a-cb6a938a0854`) — APAC
- **Sync worker:** `capstone-crm-sync` — runs hourly, syncs Google Sheets + Cloudflare Analytics into D1
- **Webpack only:** never use Turbopack (`next build --webpack` is set in package.json)

## Auth

Basic auth via `src/middleware.ts`. Username: `arvin`. Password: `CRM_PASSWORD` Worker secret (stored at `C:\Users\Arvin\.crm-secrets\crm-password.txt`).

The `/api/ingest` endpoint is explicitly excluded from auth (write-only public endpoint for lead capture).

Once Cloudflare Access is configured, delete `src/middleware.ts` and redeploy.

## Secrets

| Secret | Purpose |
|--------|---------|
| `CRM_PASSWORD` | Basic auth password |
| `CF_API_TOKEN` | Cloudflare Analytics API token (used by sync-worker) |
| `GOOGLE_CREDENTIALS` | Service account JSON for Sheets sync |
| `INGEST_SECRET` | Set but not currently used (ingest endpoint is public) |

Secrets live in `C:\Users\Arvin\.crm-secrets\` — never commit. Set via Cloudflare API (never pipe via PowerShell — BOM/newline corruption).

## Data Flow

- Website form → `POST /api/ingest` → `contacts` table (`lead_source: website`)
- Assessment completion → `POST /api/ingest` → `contacts` table (`lead_source: website`)
- Abigail WhatsApp → `POST /api/ingest` → `contacts` table (`lead_source: abigail`)
- Google Finance Tracker → sync-worker → `finance_transactions` table
- Cloudflare Web Analytics → sync-worker → `analytics_daily` + `analytics_pages` + `analytics_referrers`

## Key Files

- `src/middleware.ts` — Basic auth gate (bypasses `/api/ingest`)
- `src/app/api/ingest/route.ts` — Public lead ingestion endpoint
- `src/lib/db.ts` — D1 database helper
- `src/lib/schemas.ts` — Zod validation schemas
- `src/lib/constants.ts` — Enums (LEAD_SOURCES, SEGMENTS, STAGES, STREAMS)
- `migrations/0001_init.sql` — Full schema
- `sync-worker/` — Hourly cron worker for Sheets + Analytics sync
- `wrangler.jsonc` — Worker config (D1 binding, routes, vars)

## Lead Source Values

`LEAD_SOURCES = ['abigail', 'linkedin', 'referral', 'website', 'event', 'other']`

## Pipeline Stages

`STAGES = ['lead', 'qualified', 'proposal_sent', 'negotiation', 'won', 'lost']`
