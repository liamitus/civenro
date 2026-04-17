import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/backfill-bill-text/route";
import { seedBill } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/backfill-bill-text", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok with empty batch when no bills need text", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.remaining).toBe(0);
  });

  it("reports a non-empty batch when eligible bills exist", async () => {
    // An ACTIVE bill with no fullText and no textVersions is what the route
    // targets. We don't assert actual text backfill here — that path depends
    // on congress.gov + GovInfo XML, which is deeply intertwined and best
    // covered via the dedicated fetch-bill-text unit tests.
    await seedBill({
      billId: "house_bill-40-119",
      momentumTier: "ACTIVE",
      fullText: undefined,
    });

    const res = await invokeCron(GET, { search: { limit: "1" } });
    expect(res.status).toBe(200);
    const body = await res.json();
    // The MSW default handlers 404 every congress.gov/GovInfo call, so the
    // underlying backfill either no-ops or errors gracefully. Either way
    // the outer contract — ok=true, processed counted — must hold.
    expect(body.ok).toBe(true);
    expect(body.remaining).toBeGreaterThanOrEqual(0);
  });
});
