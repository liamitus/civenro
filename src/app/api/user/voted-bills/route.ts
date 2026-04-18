import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { VoteType } from "@/types";

/**
 * GET /api/user/voted-bills
 *
 * Returns the current user's votes — bill id + direction — so the feed can
 * show a tinted "Voted For/Against/Abstained" chip and fade voted titles.
 * Empty for anonymous users so the client can call it unconditionally.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { votes: [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const votes = await prisma.vote.findMany({
    where: { userId: user.id },
    select: { billId: true, voteType: true },
  });

  return NextResponse.json(
    {
      votes: votes.map((v) => ({
        billId: v.billId,
        voteType: v.voteType as VoteType,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
