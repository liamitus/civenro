import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export async function PATCH(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUser();
  if (error) return error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { username } = body;

  if (!username || typeof username !== "string" || !username.trim()) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  const trimmed = username.trim();

  // Update Profile first (source of truth), then sync to denormalized comment field
  await Promise.all([
    prisma.profile.update({
      where: { id: userId },
      data: { username: trimmed },
    }),
    prisma.comment.updateMany({
      where: { userId },
      data: { username: trimmed },
    }),
  ]);

  return NextResponse.json({ updated: true });
}
