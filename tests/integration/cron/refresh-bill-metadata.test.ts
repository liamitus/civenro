import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/refresh-bill-metadata/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { seedBill } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/refresh-bill-metadata", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok when nothing needs refreshing", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("populates sponsor + policyArea from Congress.gov", async () => {
    const bill = await seedBill({
      billId: "house_bill-60-119",
      // sponsor is NULL by default — makes the bill eligible.
    });

    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/60", () =>
        HttpResponse.json({
          bill: {
            title: "Congress.gov Title",
            sponsors: [
              {
                fullName: "Rep. Doe, Jane [D-CA-12]",
                firstName: "Jane",
                lastName: "Doe",
              },
            ],
            policyArea: { name: "Health" },
            latestAction: {
              actionDate: "2026-04-01",
              text: "Referred to the Subcommittee on Health.",
            },
            cosponsors: { count: 7, countIncludingWithdrawnCosponsors: 7 },
          },
        }),
      ),
      http.get("https://api.congress.gov/v3/bill/119/hr/60/cosponsors", () =>
        HttpResponse.json({
          cosponsors: [
            { party: "D", bioguideId: "D000001" },
            { party: "D", bioguideId: "D000002" },
            { party: "R", bioguideId: "R000001" },
          ],
        }),
      ),
      http.get("https://api.congress.gov/v3/bill/119/hr/60/summaries", () =>
        HttpResponse.json({ summaries: [] }),
      ),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);

    const refreshed = await getTestPrisma().bill.findUnique({
      where: { id: bill.id },
    });
    expect(refreshed?.sponsor).toBeTruthy();
    expect(refreshed?.policyArea).toBe("Health");
    expect(refreshed?.latestActionText).toBe(
      "Referred to the Subcommittee on Health.",
    );
    expect(refreshed?.lastMetadataRefreshAt).not.toBeNull();
  });
});
