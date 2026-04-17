import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/backfill-bill-actions/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { seedBill } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/backfill-bill-actions", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok with nothing to process when no eligible bills exist", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.remaining).toBe(0);
  });

  it("inserts BillAction rows for an eligible live bill", async () => {
    const bill = await seedBill({
      billId: "house_bill-30-119",
      momentumTier: "ACTIVE",
    });

    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/30/actions", () =>
        HttpResponse.json({
          actions: [
            {
              actionDate: "2026-03-01",
              text: "Introduced in House",
              type: "IntroReferral",
              sourceSystem: { name: "House floor actions" },
            },
            {
              actionDate: "2026-03-15",
              text: "Referred to Committee",
              type: "Committee",
              sourceSystem: { name: "House committee actions" },
            },
          ],
        }),
      ),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);

    const actions = await getTestPrisma().billAction.findMany({
      where: { billId: bill.id },
      orderBy: { actionDate: "asc" },
    });
    expect(actions).toHaveLength(2);
    expect(actions[0].text).toBe("Introduced in House");
    expect(actions[1].chamber).toBe("House");
  });

  it("is idempotent on repeat runs (upsert on actionDate+text)", async () => {
    await seedBill({
      billId: "house_bill-31-119",
      momentumTier: "ACTIVE",
    });

    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/31/actions", () =>
        HttpResponse.json({
          actions: [
            {
              actionDate: "2026-03-01",
              text: "Introduced in House",
              type: "IntroReferral",
              sourceSystem: { name: "House" },
            },
          ],
        }),
      ),
    );

    await invokeCron(GET);
    // Second run — the first would have upserted; the second's WHERE now
    // filters out bills that already have actions, so processed=0.
    const res = await invokeCron(GET);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(await getTestPrisma().billAction.count()).toBe(1);
  });
});
