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
        HttpResponse.json({
          summaries: [
            {
              text: "<p>This bill does something useful.</p>",
              updateDate: "2026-04-02",
            },
          ],
        }),
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
    expect(refreshed?.shortText).toContain("does something useful");
    // Summary arrived, so stamp the cooldown.
    expect(refreshed?.lastMetadataRefreshAt).not.toBeNull();
  });

  it("re-tries a bill on the next run when the CRS summary is still unpublished", async () => {
    // A bill can have sponsor + metadata but still lack a CRS summary —
    // newly introduced bills often spend weeks in that state. Pre-fix we
    // stamped lastMetadataRefreshAt on every successful fetch, which locked
    // those bills out for 14 days even though nothing had actually changed.
    // Post-fix: stamp only when shortText is populated.
    const bill = await seedBill({ billId: "house_bill-61-119" });

    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/61", () =>
        HttpResponse.json({
          bill: {
            title: "Title",
            sponsors: [{ fullName: "Rep. X [D-CA-1]" }],
            policyArea: { name: "Taxation" },
            latestAction: { actionDate: "2026-04-10", text: "Referred." },
            cosponsors: { count: 0 },
          },
        }),
      ),
      http.get("https://api.congress.gov/v3/bill/119/hr/61/cosponsors", () =>
        HttpResponse.json({ cosponsors: [] }),
      ),
      http.get("https://api.congress.gov/v3/bill/119/hr/61/summaries", () =>
        HttpResponse.json({ summaries: [] }),
      ),
    );

    await invokeCron(GET);
    const afterFirst = await getTestPrisma().bill.findUnique({
      where: { id: bill.id },
    });
    expect(afterFirst?.sponsor).toBeTruthy();
    // No short-text means we leave the cooldown clock unstarted so the bill
    // stays in the eligible pool on the next cron tick.
    expect(afterFirst?.shortText).toBeNull();
    expect(afterFirst?.lastMetadataRefreshAt).toBeNull();
  });
});
