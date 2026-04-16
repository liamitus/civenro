import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Count publicly-visible donations (same criteria as /made-possible-by).
// Small, cacheable endpoint used by the thank-you page to show a live counter.
export async function GET() {
  try {
    const count = await prisma.donation.count({
      where: {
        moderationStatus: { in: ["APPROVED", "PENDING"] },
        hiddenAt: null,
      },
    });
    return NextResponse.json(
      { count },
      {
        headers: {
          // 30s edge cache; counter doesn't need to be perfectly live.
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    return NextResponse.json({ count: null }, { status: 200 });
  }
}
