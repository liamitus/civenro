import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/user/voted-bills
 *
 * Returns the set of bill IDs the current user has voted on, as a plain
 * array. Used by the bill feed to show a "Voted" indicator and power the
 * "Hide voted" filter. Returns { billIds: [] } for anonymous users so the
 * client can call it unconditionally without branching on auth state.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { billIds: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const votes = await prisma.vote.findMany({
    where: { userId: user.id },
    select: { billId: true },
  });

  return NextResponse.json(
    { billIds: votes.map((v) => v.billId) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
