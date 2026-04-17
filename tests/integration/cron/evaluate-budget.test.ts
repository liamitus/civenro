import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/cron/evaluate-budget/route";
import { getTestPrisma } from "../db";
import { invokeCron } from "../invoke";

describe("GET /api/cron/evaluate-budget", () => {
  it("rejects missing auth", async () => {
    const res = await invokeCron(GET, { auth: null });
    expect(res.status).toBe(401);
  });

  it("bootstraps the ledger and reports a snapshot", async () => {
    const res = await invokeCron(GET);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.period).toBe("string");
    expect(body.period).toMatch(/^\d{4}-\d{2}$/);
    expect(body.incomeCents).toBe(0);
    expect(body.spendCents).toBe(0);

    const ledger = await getTestPrisma().budgetLedger.findUnique({
      where: { period: body.period },
    });
    expect(ledger).not.toBeNull();
  });

  it("reflects existing ledger spend", async () => {
    const period = new Date().toISOString().slice(0, 7);
    await getTestPrisma().budgetLedger.create({
      data: {
        period,
        incomeCents: 5000,
        spendCents: 1200,
        reserveCents: 0,
        aiEnabled: true,
      },
    });

    const res = await invokeCron(GET);
    const body = await res.json();
    expect(body.incomeCents).toBe(5000);
    expect(body.spendCents).toBe(1200);
    expect(body.aiEnabled).toBe(true);
  });
});
