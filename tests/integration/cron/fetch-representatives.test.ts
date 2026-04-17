import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { GET } from "@/app/api/cron/fetch-representatives/route";
import { server } from "../msw-server";
import { getTestPrisma } from "../db";
import { invokeCron } from "../invoke";

describe("GET /api/cron/fetch-representatives", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok with empty roster", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(await getTestPrisma().representative.count()).toBe(0);
  });

  it("upserts a representative from a GovTrack role", async () => {
    server.use(
      http.get("https://www.govtrack.us/api/v2/role", () =>
        HttpResponse.json({
          objects: [
            {
              state: "CA",
              district: 12,
              party: "Democrat",
              role_type_label: "Representative",
              person: {
                bioguideid: "P000197",
                firstname: "Nancy",
                lastname: "Pelosi",
                name: "Nancy Pelosi",
                link: "https://www.govtrack.us/congress/members/p000197",
              },
            },
          ],
          meta: { total_count: 1 },
        }),
      ),
    );

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);

    const rep = await getTestPrisma().representative.findUnique({
      where: { bioguideId: "P000197" },
    });
    expect(rep?.lastName).toBe("Pelosi");
    expect(rep?.party).toBe("Democrat");
    expect(rep?.chamber).toBe("representative");
    expect(rep?.state).toBe("CA");
  });
});
