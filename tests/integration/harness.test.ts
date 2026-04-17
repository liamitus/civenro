import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { getTestPrisma } from "./db";
import { server } from "./msw-server";
import { seedBill } from "./fixtures";

describe("integration harness", () => {
  it("connects to the testcontainer and lists tables", async () => {
    const db = getTestPrisma();
    const rows = await db.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma\\_%'`,
    );
    const names = rows.map((r) => r.tablename);
    expect(names).toContain("Bill");
    expect(names).toContain("Representative");
  });

  it("seeds and reads a bill", async () => {
    const bill = await seedBill({ title: "Harness Probe" });
    const fetched = await getTestPrisma().bill.findUnique({
      where: { id: bill.id },
    });
    expect(fetched?.title).toBe("Harness Probe");
  });

  it("truncates between tests (billSeq is reset by prior test cleanup)", async () => {
    const count = await getTestPrisma().bill.count();
    expect(count).toBe(0);
  });

  it("MSW intercepts axios calls", async () => {
    server.use(
      http.get("https://example.com/ping", () =>
        HttpResponse.json({ ok: true }),
      ),
    );
    const { default: axios } = await import("axios");
    const res = await axios.get("https://example.com/ping");
    expect(res.data).toEqual({ ok: true });
  });
});
