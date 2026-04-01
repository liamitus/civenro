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

    const vote = await prisma.vote.upsert({
      where: { userId_billId: { userId, billId } },
      update: { voteType },
      create: { userId, billId, voteType },
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
