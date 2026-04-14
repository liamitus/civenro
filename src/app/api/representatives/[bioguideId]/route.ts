import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  try {
    const rep = await prisma.representative.findUnique({
      where: { bioguideId },
    });

    if (!rep) {
      return NextResponse.json(
        { error: "Representative not found" },
        { status: 404 }
      );
    }

    // Fetch rep's voting record with bill info
    const repVotes = await prisma.representativeVote.findMany({
      where: { representativeId: rep.id },
      include: {
        bill: {
          select: {
            id: true,
            billId: true,
            title: true,
            date: true,
            link: true,
            currentStatus: true,
          },
        },
      },
      orderBy: { bill: { date: "desc" } },
    });

    // Count bills this rep has sponsored
    const fullName = `${rep.firstName} ${rep.lastName}`;
    const sponsoredBillsCount = await prisma.bill.count({
      where: {
        sponsor: { contains: fullName },
      },
    });

    // Optionally fetch user's votes on the same bills
    let userVotes: Record<number, string> | null = null;
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const billIds = repVotes.map((rv) => rv.bill.id);
        const votes = await prisma.vote.findMany({
          where: {
            userId: user.id,
            billId: { in: billIds },
          },
        });
        userVotes = {};
        for (const v of votes) {
          userVotes[v.billId] = v.voteType;
        }
      }
    } catch {
      // No auth session — userVotes stays null
    }

    // Build voting record
    const votingRecord = repVotes.map((rv) => ({
      billId: rv.bill.id,
      billSlug: rv.bill.billId,
      title: rv.bill.title,
      date: rv.bill.date.toISOString(),
      repVote: rv.vote,
      link: rv.bill.link,
      category: rv.category,
      billStatus: rv.bill.currentStatus,
    }));

    // Key votes: passage votes only, most recent first
    const keyVotes = votingRecord
      .filter((v) => v.category === "passage" && (v.repVote === "Yea" || v.repVote === "Nay"))
      .slice(0, 6);

    // Compute stats
    const totalVotes = repVotes.length;
    const missedVotes = repVotes.filter((rv) => rv.vote === "Not Voting").length;
    const yeaCount = repVotes.filter((rv) => rv.vote === "Yea").length;
    const nayCount = repVotes.filter((rv) => rv.vote === "Nay").length;

    return NextResponse.json({
      representative: {
        id: rep.id,
        bioguideId: rep.bioguideId,
        slug: rep.slug,
        firstName: rep.firstName,
        lastName: rep.lastName,
        state: rep.state,
        district: rep.district,
        party: rep.party,
        chamber: rep.chamber,
        imageUrl: rep.imageUrl,
        link: rep.link,
      },
      votingRecord,
      keyVotes,
      sponsoredBillsCount,
      userVotes,
      stats: {
        totalVotes,
        missedVotes,
        missedVotePct: totalVotes > 0 ? Math.round((missedVotes / totalVotes) * 100) : 0,
        yeaCount,
        nayCount,
      },
    });
  } catch (error) {
    console.error("Error fetching representative detail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
