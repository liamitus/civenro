/**
 * Preview-deploy write guard.
 *
 * Vercel Preview deploys currently share Production's Supabase credentials
 * (DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.) so the build can render.
 * That means a buggy PR could write to production data through any API
 * route reachable on a preview URL.
 *
 * To bound the blast radius, we refuse write-method requests under /api on
 * Preview deploys. GET/HEAD/OPTIONS still flow through, so previews remain
 * useful for UI verification.
 *
 * Local dev (VERCEL_ENV=development) and Production (VERCEL_ENV=production)
 * are unaffected.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function isPreviewEnv(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

export function isWriteMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase());
}
