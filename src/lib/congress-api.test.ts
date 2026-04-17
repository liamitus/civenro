import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  fetchAllTextVersions,
  fetchBillActions,
  fetchOfficialBillTitle,
} from "./congress-api";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchAllTextVersions", () => {
  it("returns versions sorted oldest-first", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/1/text", () =>
        HttpResponse.json({
          textVersions: [
            { date: "2026-03-01", type: "Engrossed", formats: [] },
            { date: "2026-01-15", type: "Introduced", formats: [] },
            { date: "2026-02-10", type: "Reported", formats: [] },
          ],
        }),
      ),
    );

    const versions = await fetchAllTextVersions(119, "hr", 1);

    expect(versions.map((v) => v.date)).toEqual([
      "2026-01-15",
      "2026-02-10",
      "2026-03-01",
    ]);
  });

  it("returns empty array when API returns no textVersions", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/1/text", () =>
        HttpResponse.json({}),
      ),
    );

    const versions = await fetchAllTextVersions(119, "hr", 1);
    expect(versions).toEqual([]);
  });

  it("returns empty array on server error (does not throw)", async () => {
    server.use(
      http.get(
        "https://api.congress.gov/v3/bill/119/hr/1/text",
        () => new HttpResponse(null, { status: 500 }),
      ),
    );

    const versions = await fetchAllTextVersions(119, "hr", 1);
    expect(versions).toEqual([]);
  });
});

describe("fetchBillActions", () => {
  it("maps Senate/House chamber from sourceSystem.name", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/1/actions", () =>
        HttpResponse.json({
          actions: [
            {
              actionDate: "2026-04-10",
              text: "Passed Senate",
              type: "Floor",
              sourceSystem: { name: "Senate" },
            },
            {
              actionDate: "2026-04-05",
              text: "Reported by House Committee",
              type: "Committee",
              sourceSystem: { name: "House floor actions" },
            },
            {
              actionDate: "2026-04-01",
              text: "Referred to committee",
              type: "IntroReferral",
              sourceSystem: { name: "Library of Congress" },
            },
          ],
        }),
      ),
    );

    const actions = await fetchBillActions(119, "hr", 1);

    expect(actions).not.toBeNull();
    expect(actions).toHaveLength(3);
    expect(actions![0].chamber).toBe("Senate");
    expect(actions![1].chamber).toBe("House");
    expect(actions![2].chamber).toBeNull();
  });

  it("returns null when API response shape is malformed", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/hr/1/actions", () =>
        HttpResponse.json({ actions: "not-an-array" }),
      ),
    );

    const actions = await fetchBillActions(119, "hr", 1);
    expect(actions).toBeNull();
  });
});

describe("fetchOfficialBillTitle", () => {
  it("returns the bill title when present", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/s/42", () =>
        HttpResponse.json({
          bill: { title: "A bill to improve civic engagement." },
        }),
      ),
    );

    const title = await fetchOfficialBillTitle(119, "s", 42);
    expect(title).toBe("A bill to improve civic engagement.");
  });

  it("returns null when title is missing", async () => {
    server.use(
      http.get("https://api.congress.gov/v3/bill/119/s/42", () =>
        HttpResponse.json({ bill: {} }),
      ),
    );

    const title = await fetchOfficialBillTitle(119, "s", 42);
    expect(title).toBeNull();
  });
});
