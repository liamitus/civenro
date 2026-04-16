import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/bills/:id/ai-context
 *
 * Lightweight probe — does this bill have text the AI can quote from?
 * The chatbox calls this on mount so it can set expectations BEFORE the
 * user types a question, rather than having the AI dutifully answer from
 * the title and then confess at the bottom.
 *
 * Returns:
 *   { hasFullText: boolean, hasShortText: boolean, tier: "full"|"summary"|"title-only" }
 *
 * Caches 5 minutes at the edge — text availability rarely changes.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const billId = parseInt(id, 10);
  if (!Number.isFinite(billId)) {
    return NextResponse.json({ error: "Invalid bill id" }, { status: 400 });
  }

  const [bill, latestVersion] = await Promise.all([
    prisma.bill.findUnique({
      where: { id: billId },
      select: { fullText: true, shortText: true },
    }),
    prisma.billTextVersion.findFirst({
      where: { billId, fullText: { not: null } },
      select: { id: true },
    }),
  ]);

  if (!bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const hasFullText =
    (bill.fullText != null && bill.fullText.length > 0) ||
    latestVersion != null;
  const hasShortText = bill.shortText != null && bill.shortText.length > 0;

  const tier: "full" | "summary" | "title-only" = hasFullText
    ? "full"
    : hasShortText
      ? "summary"
      : "title-only";

  return NextResponse.json(
    { hasFullText, hasShortText, tier },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
