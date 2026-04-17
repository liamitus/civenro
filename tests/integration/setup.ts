import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./msw-server";
import { resetDb } from "./db";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "TEST_DATABASE_URL is not set — did global-setup.ts run? " +
      "Use `npm run test:integration` or export TEST_DATABASE_URL manually.",
  );
}

// Route/script modules read DATABASE_URL at import time, so set it before
// any of them load. Same for the other env toggles the routes check.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.CRON_SECRET = process.env.CRON_SECRET ?? "test-cron-secret";
// Keep error-reporting.ts silent (it no-ops when these are absent).
delete process.env.RESEND_API_KEY;
delete process.env.ALERT_EMAIL;
// API keys — present but fake so code paths that check-and-throw don't throw;
// all external HTTP goes through MSW anyway.
process.env.CONGRESS_DOT_GOV_API_KEY =
  process.env.CONGRESS_DOT_GOV_API_KEY ?? "test-congress-key";
process.env.GOOGLE_CIVIC_API_KEY =
  process.env.GOOGLE_CIVIC_API_KEY ?? "test-civic-key";
process.env.ANTHROPIC_API_KEY =
  process.env.ANTHROPIC_API_KEY ?? "test-anthropic-key";
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "test-openai-key";

beforeAll(() => {
  // Fail loudly on any un-mocked external HTTP — silent pass-through to
  // the real internet is the failure mode that makes integration tests
  // flaky and expensive, so don't tolerate it.
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(async () => {
  server.resetHandlers();
  await resetDb();
});

afterAll(() => {
  server.close();
});
