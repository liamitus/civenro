-- Enable Row Level Security on all tables in the public schema.
--
-- Rationale: Supabase flagged (2026-04-13) that tables without RLS are
-- accessible via PostgREST using the anon key, which is publicly embedded
-- in every page load via NEXT_PUBLIC_SUPABASE_ANON_KEY. Without RLS, any
-- site visitor could have read/written Profile, Donation, AdminUser,
-- Conversation, Message, Vote, etc. via the Supabase REST API.
--
-- Govroll queries data exclusively through Prisma (DATABASE_URL connects
-- as the postgres superuser role, which bypasses RLS by default).
-- Supabase-js is only used for auth (separate schema) and storage
-- (separate API). Enabling RLS with NO policies is therefore safe: it
-- shuts off the anon/authenticated PostgREST surface entirely while
-- leaving the app unaffected.
--
-- This migration was first applied manually via the Supabase SQL editor
-- on 2026-04-14 to close the active breach window. The SQL is idempotent
-- (ALTER TABLE ... ENABLE ROW LEVEL SECURITY is a no-op when already
-- enabled), so `prisma migrate deploy` running this against prod is safe.

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;
