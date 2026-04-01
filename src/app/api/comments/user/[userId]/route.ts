import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  try {
    const [total, comments] = await Promise.all([
      prisma.comment.count({ where: { userId } }),
      prisma.comment.findMany({
        where: { userId },
        include: {
          bill: { select: { id: true, title: true } },
          commentVotes: true,
        },
        orderBy: { date: "desc" },
        skip,
        take: limit,
      }),
    ]);

    const commentsWithVoteCounts = comments.map((comment) => {
      const voteCount = comment.commentVotes.reduce(
        (sum, vote) => sum + vote.voteType,
        0
      );
      return { ...comment, voteCount };
    });

    return NextResponse.json({ comments: commentsWithVoteCounts, total });
  } catch (error) {
    console.error("Error fetching user comments:", error);
    return NextResponse.json(
      { error: "Failed to fetch user comments" },
      { status: 500 }
    );
  }
}
