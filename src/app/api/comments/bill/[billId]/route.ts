import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface CommentWithReplies {
  id: number;
  content: string;
  userId: string;
  username: string;
  billId: number;
  parentCommentId: number | null;
  date: Date;
  voteCount: number;
  replies: CommentWithReplies[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
) {
  const { billId } = await params;
  const id = parseInt(billId);
  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;
  const sortOption = request.nextUrl.searchParams.get("sort") === "best" ? "best" : "new";

  try {
    const total = await prisma.comment.count({
      where: { billId: id, parentCommentId: null },
    });

    const comments = await getCommentsWithVotes(null, id, skip, limit);

    if (sortOption === "best") {
      comments.sort((a, b) => b.voteCount - a.voteCount);
    }

    return NextResponse.json({ comments, total });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function getCommentsWithVotes(
  parentCommentId: number | null,
  billId: number,
  skip: number,
  take: number
): Promise<CommentWithReplies[]> {
  const comments = await prisma.comment.findMany({
    where: { billId, parentCommentId },
    orderBy: { date: "desc" },
    skip,
    take,
  });

  return Promise.all(
    comments.map(async (comment) => {
      const voteCount = await getVoteCount(comment.id);
      const replies = await getCommentsWithVotes(comment.id, billId, 0, 10);
      return {
        ...comment,
        voteCount,
        replies,
      };
    })
  );
}

async function getVoteCount(commentId: number): Promise<number> {
  const result = await prisma.commentVote.aggregate({
    where: { commentId },
    _sum: { voteType: true },
  });
  return result._sum.voteType || 0;
}
