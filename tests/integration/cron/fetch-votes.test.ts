import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/fetch-votes/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { seedRepresentative } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/fetch-votes", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok when GovTrack has no votes", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    expect(await getTestPrisma().representativeVote.count()).toBe(0);
  });

  it("upserts bill + representativeVote for a known representative", async () => {
    const rep = await seedRepresentative({
      bioguideId: "S000148",
      firstName: "Chuck",
      lastName: "Schumer",
      state: "NY",
      chamber: "senator",
    });

    // The route walks one day at a time from (now - 2d). Return the voter
    // once and empty on subsequent calls so the loop terminates quickly.
    let voterCalls = 0;
    server.use(
      http.get("https://www.govtrack.us/api/v2/vote_voter", () => {
        voterCalls++;
        if (voterCalls > 1) {
          return HttpResponse.json({ objects: [], meta: { total_count: 0 } });
        }
        return HttpResponse.json({
          objects: [
            {
              person: { bioguideid: rep.bioguideId },
              option: { value: "Yea" },
              vote: {
                related_bill: 99999,
                number: 321,
                chamber: "senate",
                created: "2026-04-10T19:00:00Z",
                category: "passage",
              },
            },
          ],
          meta: { total_count: 1 },
        });
      }),
      http.get("https://www.govtrack.us/api/v2/bill/:id", () =>
        HttpResponse.json({
          bill_type: "s",
          number: 1234,
          congress: 119,
          introduced_date: "2026-02-01",
          current_chamber: "senate",
          current_status: "passed_senate",
          current_status_date: "2026-04-10",
          link: "https://www.govtrack.us/congress/bills/119/s1234",
          title_without_number: "Integration Vote Test Act",
        }),
      ),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);

    const bill = await getTestPrisma().bill.findUnique({
      where: { billId: "s-1234-119" },
    });
    expect(bill).not.toBeNull();

    const votes = await getTestPrisma().representativeVote.findMany({
      where: { representativeId: rep.id },
    });
    expect(votes).toHaveLength(1);
    expect(votes[0].vote).toBe("Yea");
    expect(votes[0].rollCallNumber).toBe(321);
  });
});
