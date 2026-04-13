import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";
import { reportError } from "@/lib/error-reporting";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { commentId, voteType } = body;

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
    reportError(err, { route: "POST /api/comment-votes" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
