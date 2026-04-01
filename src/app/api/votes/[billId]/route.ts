import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ billId: string }> }
) {
  const { billId } = await params;
  const id = parseInt(billId);

  try {
    const [publicVotes, congressionalVotes] = await Promise.all([
      prisma.vote.groupBy({
        by: ["voteType"],
        where: { billId: id },
        _count: { voteType: true },
      }),
      prisma.representativeVote.groupBy({
        by: ["vote"],
        where: { billId: id },
        _count: { vote: true },
      }),
    ]);

    return NextResponse.json({
      publicVotes: publicVotes.map((v) => ({
        voteType: v.voteType,
        count: v._count.voteType,
      })),
      congressionalVotes: congressionalVotes.map((v) => ({
        vote: v.vote,
        count: v._count.vote,
      })),
    });
  } catch (error) {
    console.error("Error fetching votes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
