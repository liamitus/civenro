import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/compute-momentum/route";
import { getTestPrisma } from "../db";
import { seedBill } from "../fixtures";
import { invokeCron } from "../invoke";

describe("GET /api/cron/compute-momentum", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("returns ok=0 when nothing to compute", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.result.ok).toBe(0);
  });

  it("writes momentumTier/score on uncomputed bills", async () => {
    const b1 = await seedBill({
      currentStatus: "introduced",
      currentStatusDate: new Date("2026-04-01"),
      introducedDate: new Date("2026-04-01"),
    });
    const b2 = await seedBill({
      currentStatus: "prov_kill:veto",
      currentStatusDate: new Date("2025-03-01"),
      introducedDate: new Date("2025-01-01"),
    });

    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.ok).toBe(2);

    const rows = await getTestPrisma().bill.findMany({
      where: { id: { in: [b1.id, b2.id] } },
      select: { id: true, momentumTier: true, momentumComputedAt: true },
    });
    for (const row of rows) {
      expect(row.momentumTier).not.toBeNull();
      expect(row.momentumComputedAt).not.toBeNull();
    }
  });

  it("respects full=1 to recompute already-scored bills", async () => {
    const original = new Date("2020-01-01");
    await seedBill({
      currentStatus: "introduced",
      momentumTier: "ACTIVE",
      momentumScore: 10,
    });
    // Force momentumComputedAt to something fresh enough to be excluded by the
    // incremental selector.
    await getTestPrisma().bill.updateMany({
      data: { momentumComputedAt: new Date() },
    });

    const incremental = await invokeCron(GET, { search: { limit: "5" } });
    expect(
      ((await incremental.json()) as { result: { ok: number } }).result.ok,
    ).toBe(0);

    const full = await invokeCron(GET, { search: { limit: "5", full: "1" } });
    const body = (await full.json()) as { result: { ok: number } };
    expect(body.result.ok).toBe(1);

    // Sanity: computedAt was bumped (sanity against `original`).
    const row = await getTestPrisma().bill.findFirst();
    expect(row?.momentumComputedAt?.getTime()).toBeGreaterThan(
      original.getTime(),
    );
  });
});
