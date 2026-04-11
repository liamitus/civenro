import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveUsername } from "@/lib/citizen-id";

export async function POST(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId();
  if (error) return error;

  const { billId, content, parentCommentId } = await request.json();

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

    // Resolve display name: explicit username > OAuth first name > Citizen-XXXX
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    const username = user ? resolveUsername(user) : "Anonymous";

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
    console.error("Error submitting comment:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
