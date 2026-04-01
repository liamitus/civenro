# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server (Next.js 16, Turbopack)
npm run build        # Production build
npm run lint         # ESLint
npx prisma generate  # Regenerate Prisma client after schema changes
npx prisma migrate dev  # Run migrations
npx tsx src/scripts/fetch-bills.ts       # Fetch bills from GovTrack
npx tsx src/scripts/fetch-representatives.ts  # Fetch congressional reps
npx tsx src/scripts/fetch-votes.ts       # Fetch representative votes
npx tsx src/scripts/fetch-bill-text.ts [billId]  # Fetch bill text from congress.gov
```

## Architecture

Single Next.js 16 App Router project. Supabase for auth + PostgreSQL. Prisma 7 ORM with `@prisma/adapter-pg`.

### Key Patterns

- **`params` is a Promise** in Next.js 16 — always `await params` in page/route handlers
- **Proxy** (not middleware) — `src/proxy.ts` refreshes Supabase sessions
- **Prisma 7** requires a driver adapter — no `url` in schema, see `src/lib/prisma.ts`
- **Scripts** use `src/lib/prisma-standalone.ts` (relative imports) vs the Next.js app which uses `src/lib/prisma.ts` (`@/` alias imports)

### Route Structure

- `/` — Address-first landing page (hero input → localStorage → redirect to /bills)
- `/bills` — SSR bill feed with client-side filtering, search, infinite scroll
- `/bills/[id]` — SSR bill detail (server-rendered header) + client interactive sections (vote, comments, AI chat, representatives)
- `/account` — Client-side account page (Supabase Auth user)

### API Routes (`src/app/api/`)

- `bills/` — List (GET with pagination/filter/search) and detail (GET by id)
- `votes/` — Submit vote (POST, auth required), aggregate votes by bill (GET)
- `comments/` — Create (POST, auth required), list by bill, list by user, delete
- `comment-votes/` — Upvote/downvote comments (POST, auth required)
- `representatives/` — Lookup by address + bill (POST, uses Google Civic API)
- `ai/chat/` — AI chat with context stuffing (GET conversation, POST message)
- `admin/` — Data ingestion triggers (fetch bills/reps/votes/text, API key required in prod)

### AI Layer (`src/lib/ai.ts`)

Provider-agnostic: detects `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` at runtime. Uses context stuffing (full bill text in prompt) instead of RAG/embeddings.

### Data Flow

1. Scripts fetch from GovTrack/congress.gov APIs → Prisma → PostgreSQL
2. Bill text stored directly in `Bill.fullText` column (no separate chunks/embeddings)
3. Auth handled by Supabase — user IDs are Supabase UUIDs (string), not integer foreign keys
4. Address stored in client localStorage, never sent to our server for storage

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` — AI chat (at least one required)
- `GOOGLE_CIVIC_API_KEY` — Representative lookup by address
- `CONGRESS_DOT_GOV_API_KEY` — Bill text fetching
- `ADMIN_API_KEY` — Protects admin endpoints in production
