import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/admin/moderation — list donations needing review (FLAGGED status).
 * PATCH /api/admin/moderation — approve or reject a flagged donation.
 *
 * Both endpoints require the caller to be in the AdminUser table.
 */

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function GET() {
  const userId = await getAuthUserId();
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const flagged = await prisma.donation.findMany({
    where: { moderationStatus: "FLAGGED" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayNameRaw: true,
      tributeNameRaw: true,
      displayMode: true,
      moderationNotes: true,
      amountCents: true,
      createdAt: true,
      email: true,
    },
    take: 100,
  });

  return NextResponse.json({ items: flagged });
}

export async function PATCH(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { donationId, action } = body;

  if (!donationId || !["approve", "reject"].includes(action)) {
    return NextResponse.json(
      { error: "donationId and action (approve|reject) are required." },
      { status: 400 }
    );
  }

  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
  });

  if (!donation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (action === "approve") {
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        moderationStatus: "APPROVED",
        displayName: donation.displayNameRaw?.trim() ?? null,
        tributeName: donation.tributeNameRaw?.trim() ?? null,
        moderationNotes: `${donation.moderationNotes ?? ""}; manually approved by ${userId}`,
      },
    });
  } else {
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        moderationStatus: "REJECTED",
        displayName: null,
        tributeName: null,
        moderationNotes: `${donation.moderationNotes ?? ""}; manually rejected by ${userId}`,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
