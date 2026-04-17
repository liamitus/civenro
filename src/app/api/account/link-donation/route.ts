import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * POST /api/account/link-donation
 *
 * Claims a donation by providing a one-time link token. This lets donors
 * who checked out without logging in attach the donation to their account.
 * The token is included in the post-donation email.
 */
export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "Sign in to link a donation." },
      { status: 401 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
  const { token } = body;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required." }, { status: 400 });
  }

  const linkToken = await prisma.donorLinkToken.findUnique({
    where: { token },
    include: { donation: { select: { id: true, userId: true } } },
  });

  if (!linkToken) {
    return NextResponse.json(
      { error: "Invalid or expired link." },
      { status: 404 },
    );
  }

  if (linkToken.usedAt) {
    return NextResponse.json(
      { error: "This link has already been used." },
      { status: 409 },
    );
  }

  if (linkToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This link has expired." },
      { status: 410 },
    );
  }

  if (linkToken.donation.userId) {
    return NextResponse.json(
      { error: "This donation is already linked to an account." },
      { status: 409 },
    );
  }

  // Link the donation to the current user and mark the token as used
  await prisma.$transaction([
    prisma.donation.update({
      where: { id: linkToken.donationId },
      data: { userId: user.id },
    }),
    prisma.donorLinkToken.update({
      where: { id: linkToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, donationId: linkToken.donationId });
}
