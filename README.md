# Capstone CRM

A business CRM dashboard — pipeline, contacts, finance, follow-ups, analytics, and an
AI-powered Content Creation module — built with Next.js and deployed as a single Cloudflare
Worker via [OpenNext](https://opennext.js.org/cloudflare).

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS 4** + [shadcn/ui](https://ui.shadcn.com/) + [recharts](https://recharts.org/)
- **Cloudflare Workers** (via `@opennextjs/cloudflare`) — D1 for data, R2 for generated images
- **Zod** for request validation, [`ulid`](https://github.com/ulid/spec) for IDs
- A separate **cron Worker** (`sync-worker/`) pulls finance data from Google Sheets and web
  traffic from Cloudflare Web Analytics into D1 on an hourly schedule

## Features

- **Pipeline** — deal stages (lead → qualified → proposal → negotiation → won/lost), drag-and-drop
- **Contacts** — segmented (FA/MNC/GOV/SME), touchpoints, follow-ups, deal history
- **Finance** — income/expense tracking synced from Google Sheets
- **Analytics** — visitor/page/referrer stats synced from Cloudflare Web Analytics
- **Content Creation** — paste an article, an LLM drafts an illustrated "shot list," and an
  image-generation API renders each shot in a consistent hand-drawn style with a recurring
  character, "Xiaohei" — supports Chinese and English label modes

## Getting started

```bash
npm install
cp .dev.vars.example .dev.vars   # fill in your own secrets, see below
npx wrangler d1 migrations apply <your-d1-database-name> --local
npx wrangler dev                 # local dev with real D1/binding access
```

`next dev` alone does **not** give you binding access (D1, R2, etc.) — use `npx wrangler dev`
for anything that touches the database or storage.

### Deploy

```bash
npm run build                       # next build --webpack (never Turbopack — see below)
npx opennextjs-cloudflare build
npx wrangler deploy
```

Deploy the sync worker separately:

```bash
npx wrangler deploy -c sync-worker/wrangler.jsonc
```

### Configuration

Copy `wrangler.jsonc` and fill in your own:

- D1 database (`d1_databases`)
- R2 bucket for Content Creation images (`r2_buckets`)
- Custom domain route, if any (`routes`)

Set these as Worker secrets (`npx wrangler secret put <NAME>`) rather than plain vars:

| Secret | Purpose |
|---|---|
| `CRM_PASSWORD` | Basic-auth password gating the whole app (see `src/middleware.ts`) |
| `KIE_API_KEY` | [kie.ai](https://kie.ai) — image generation for Content Creation |
| `OPENAI_API_KEY` | Shot-list drafting for Content Creation |
| `SHEETS_SERVICE_ACCOUNT` | Google service-account JSON — finance sync |
| `INCOME_SHEET_ID` / `EXPENSES_SHEET_ID` | Google Sheet IDs — finance sync |
| `CF_API_TOKEN` | Cloudflare Analytics API token — analytics sync |

Optional: `CRM_USERNAME` (defaults to `arvin` if unset).

## Notes

- **Webpack only** — `npm run build` runs `next build --webpack`. Never switch to Turbopack;
  it breaks the OpenNext build.
- **Two-step deploy** — running `npm run build` alone does *not* update a deployed Worker; you
  must run `opennextjs-cloudflare build` and `wrangler deploy` afterward.
- **Auth** — a single shared HTTP Basic Auth credential fronts every route except `/api/ingest`
  (a public webhook for lead capture). This is an interim measure; swap in your own auth before
  relying on it for anything sensitive.
- D1 schema conventions (see `migrations/0001_init.sql`): TEXT `ulid()` ids, ISO-8601 TEXT
  timestamps, money stored as INTEGER cents, booleans as INTEGER 0/1.
