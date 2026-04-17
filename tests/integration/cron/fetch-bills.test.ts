import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/fetch-bills/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { invokeCron } from "../invoke";

describe("GET /api/cron/fetch-bills", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("rejects wrong bearer", async () => {
    const res = await invokeCron(GET, { auth: "Bearer wrong" });
    expect(res.status).toBe(401);
  });

  it("returns ok when GovTrack has no new bills", async () => {
    // Default handlers already return empty list — just verify the 200 path.
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(await getTestPrisma().bill.count()).toBe(0);
  });

  it("upserts bills returned by GovTrack", async () => {
    const govTrackBill = {
      bill_type: "hr",
      number: 4242,
      congress: 119,
      introduced_date: "2026-03-01",
      current_chamber: "house",
      current_status: "introduced",
      current_status_date: "2026-03-01",
      link: "https://www.govtrack.us/congress/bills/119/hr4242",
      title_without_number: "Test Transparency Act",
    };

    let callCount = 0;
    server.use(
      http.get("https://www.govtrack.us/api/v2/bill", () => {
        callCount++;
        // Return the bill on the first call only — later month windows get
        // empty so the loop terminates.
        if (callCount === 1) {
          return HttpResponse.json({
            objects: [govTrackBill],
            meta: { total_count: 1 },
          });
        }
        return HttpResponse.json({ objects: [], meta: { total_count: 0 } });
      }),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);

    const stored = await getTestPrisma().bill.findUnique({
      where: { billId: "hr-4242-119" },
    });
    expect(stored).not.toBeNull();
    expect(stored?.title).toBe("Test Transparency Act");
    expect(stored?.currentChamber).toBe("house");
  });
});
