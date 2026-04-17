import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/fetch-data/route";
import { invokeCron } from "../invoke";

describe("GET /api/cron/fetch-data (deprecated)", () => {
  it("returns 410 Gone with a pointer to the new endpoints", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(410);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toBe("gone");
    expect(body.message).toContain("ingest.yml");
  });

  it("returns 410 even without auth — the route is retired, not protected", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(410);
  });
});
