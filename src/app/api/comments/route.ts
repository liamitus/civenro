import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { reportError } from "@/lib/error-reporting";

export async function POST(request: NextRequest) {
  const { userId, username, error } = await getAuthenticatedUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { billId, content, parentCommentId } = body;

  if (!billId || !content) {
    return NextResponse.json(
      { error: "billId and content are required" },
      { status: 400 }
    );
  }

  if (content.length > 10000) {
    return NextResponse.json(
      { error: "Comment is too long." },
      { status: 400 }
    );
  }

  // Duplicate check
  const recentComment = await prisma.comment.findFirst({
    where: {
      userId,
      billId,
      content,
      date: { gte: new Date(Date.now() - 60000) },
    },
  });

  if (recentComment) {
    return NextResponse.json(
      { error: "Duplicate comment detected" },
      { status: 429 }
    );
  }

  try {
    const bill = await prisma.bill.findUnique({ where: { id: billId } });
    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: {
        userId,
        username,
        billId,
        content,
        parentCommentId: parentCommentId || null,
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    console.error(JSON.stringify({ event: "api_error", route: "POST /api/comments", error: err instanceof Error ? err.message : String(err) }));
    reportError(err, { route: "POST /api/comments" });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
