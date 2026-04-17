# Govroll

Civic transparency platform that makes legislation accessible to everyday people. Track bills, see how your representatives vote, and engage with the legislative process.

**Production:** [govroll.com](https://govroll.com)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL via Prisma (with `@prisma/adapter-pg`)
- **Auth:** Supabase Auth
- **Hosting:** Vercel
- **AI:** OpenAI + Anthropic (bill chat)
- **Payments:** Stripe (donations)
- **Data Sources:** GovTrack API, Congress.gov API

## Local Development

### Prerequisites

- Node.js 20+
- Docker (for local PostgreSQL)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template and fill in your values
cp .env.example .env

# 3. Start local PostgreSQL
docker compose up -d

# 4. Run database migrations
npx prisma migrate deploy

# 5. Seed with sample data
npm run db:seed

# 6. Start dev server
npm run dev
```

The app runs at **http://localhost:1776**.

### Useful Commands

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `npm run dev`            | Start dev server on port 1776               |
| `npm run db:seed`        | Seed local DB with sample data              |
| `npm run db:reset`       | Reset DB and re-run all migrations          |
| `npm run db:studio`      | Open Prisma Studio (DB browser)             |
| `npm run lint`           | Run ESLint                                  |
| `npx prisma migrate dev` | Create a new migration after schema changes |

### Data Backfill Scripts

To populate your local DB with real data from legislative APIs:

```bash
npx tsx src/scripts/fetch-representatives.ts      # ~5s, no API key needed
npx tsx src/scripts/fetch-bills.ts                 # ~3min, no API key needed
npx tsx src/scripts/fetch-bill-text.ts --limit 20  # ~1min, needs CONGRESS_DOT_GOV_API_KEY
npx tsx src/scripts/fetch-bill-actions.ts          # ~2min, needs CONGRESS_DOT_GOV_API_KEY
npx tsx src/scripts/fetch-votes.ts                 # ~15min, no API key needed
```

## Environment Strategy

| File            | Committed | Purpose                                     |
| --------------- | --------- | ------------------------------------------- |
| `.env.example`  | Yes       | Template with placeholder values            |
| `.env`          | No        | Local dev config (copy from `.env.example`) |
| Vercel env vars | N/A       | Production secrets (set in dashboard)       |

There is no staging environment. All changes go directly from local dev to production via `main` branch pushes.

### Syncing Env Vars to Vercel

```bash
./scripts/setup-vercel-env.sh
```

This script reads your `.env` and upserts each variable into Vercel project settings. `NEXT_PUBLIC_*` vars go to all environments; secrets go to production only. `DATABASE_URL` is excluded (production uses a different database).

## Deployment

Push to `main` triggers an automatic Vercel deployment. The build runs:

```
prisma generate && next build
```

### Cron Jobs

| Cron                        | Schedule           | Description                                   |
| --------------------------- | ------------------ | --------------------------------------------- |
| `/api/cron/fetch-data`      | Daily 10 AM ET     | Fetches new bills, text, actions, votes, reps |
| `/api/cron/evaluate-budget` | Daily midnight UTC | Recomputes AI budget gate                     |

Both require `CRON_SECRET` to be set in Vercel project settings.

## Architecture Notes

- **API routes** live in `src/app/api/`. Protected routes use `getAuthenticatedUserId()` from `src/lib/auth.ts`.
- **Admin endpoints** (`/api/admin/*`) require the `ADMIN_API_KEY` header.
- **AI chat** is budget-gated: if monthly AI spend exceeds donation income, chat is automatically disabled. See `src/lib/budget.ts` and `src/lib/ai-gate.ts`.
- **Bill data** flows: GovTrack (bills, votes, reps) + Congress.gov (text, actions, metadata). The daily cron keeps both in sync.
