import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId();
  if (error) return error;

  const { commentId, voteType } = await request.json();

  if (!commentId || ![1, -1].includes(voteType)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const vote = await prisma.commentVote.upsert({
      where: { userId_commentId: { userId, commentId } },
      update: { voteType },
      create: { userId, commentId, voteType },
    });

    return NextResponse.json(vote);
  } catch (err) {
    console.error("Error submitting comment vote:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
