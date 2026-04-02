import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId();
  if (error) return error;

  const { billId, voteType } = await request.json();

  if (!billId || !voteType) {
    return NextResponse.json(
      { error: "billId and voteType are required" },
      { status: 400 }
    );
  }

  if (!["For", "Against", "Abstain"].includes(voteType)) {
    return NextResponse.json({ error: "Invalid voteType" }, { status: 400 });
  }

  try {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Find the latest text version for this bill
    const latestVersion = await prisma.billTextVersion.findFirst({
      where: { billId },
      orderBy: { versionDate: "desc" },
    });

    const vote = await prisma.vote.upsert({
      where: { userId_billId: { userId, billId } },
      update: {
        voteType,
        textVersionId: latestVersion?.id ?? null,
        votedAt: new Date(),
      },
      create: {
        userId,
        billId,
        voteType,
        textVersionId: latestVersion?.id ?? null,
      },
    });

    // Append to vote history audit trail
    await prisma.voteHistory.create({
      data: {
        userId,
        billId,
        voteType,
        textVersionId: latestVersion?.id ?? null,
      },
    });

    return NextResponse.json(vote);
  } catch (error) {
    console.error("Error submitting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
