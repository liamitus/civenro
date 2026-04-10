import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * GET /api/account/donations — list the logged-in user's contributions.
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const donations = await prisma.donation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      isRecurring: true,
      recurringStatus: true,
      displayMode: true,
      displayName: true,
      tributeName: true,
      createdAt: true,
      hiddenAt: true,
    },
  });

  return NextResponse.json({ donations });
}

/**
 * PATCH /api/account/donations — modify a donation's display settings.
 * Supports "anonymize" and "hide" actions. Covers GDPR/CCPA right to retract.
 */
export async function PATCH(request: NextRequest) {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { donationId, action } = await request.json();

  if (!donationId || !["anonymize", "hide"].includes(action)) {
    return NextResponse.json(
      { error: "donationId and action (anonymize|hide) required." },
      { status: 400 }
    );
  }

  // Verify ownership
  const donation = await prisma.donation.findFirst({
    where: { id: donationId, userId },
  });
  if (!donation) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (action === "anonymize") {
    await prisma.donation.update({
      where: { id: donationId },
      data: {
        displayMode: "ANONYMOUS",
        displayName: null,
        tributeName: null,
      },
    });
  } else {
    await prisma.donation.update({
      where: { id: donationId },
      data: { hiddenAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
