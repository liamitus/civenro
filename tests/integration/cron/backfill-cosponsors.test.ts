import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/backfill-cosponsors/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { seedBill, seedRepresentative } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/backfill-cosponsors", () => {
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
  });

  it("persists BillCosponsor rows for a matched representative", async () => {
    const rep = await seedRepresentative({
      bioguideId: "T000478",
      firstName: "Ritchie",
      lastName: "Torres",
    });
    const bill = await seedBill({
      billId: "house_bill-50-119",
      momentumTier: "ACTIVE",
      // The route requires aggregate cosponsorCount > 0 to bother fetching.
    });
    await getTestPrisma().bill.update({
      where: { id: bill.id },
      data: { cosponsorCount: 1 },
    });

    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/50/cosponsors", () =>
        HttpResponse.json({
          cosponsors: [
            {
              bioguideId: rep.bioguideId,
              firstName: rep.firstName,
              lastName: rep.lastName,
              sponsorshipDate: "2026-02-14",
              isOriginalCosponsor: true,
            },
          ],
        }),
      ),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(1);

    const rows = await getTestPrisma().billCosponsor.findMany({
      where: { billId: bill.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].representativeId).toBe(rep.id);
    expect(rows[0].isOriginal).toBe(true);
  });
});
