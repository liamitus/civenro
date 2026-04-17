import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusMapping } from "@/lib/status-mapping";
import { reportError } from "@/lib/error-reporting";

// Momentum filter buckets:
//   live      — ACTIVE + ADVANCING + ENACTED (default feed)
//   graveyard — DEAD only
//   all       — no momentum filter applied
const LIVE_TIERS = ["ACTIVE", "ADVANCING", "ENACTED"];
const GRAVEYARD_TIERS = ["DEAD"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const chamber = searchParams.get("chamber");
  const status = searchParams.get("status");
  const momentum = searchParams.get("momentum") || "live";
  const sortBy = searchParams.get("sortBy") || "relevant";
  const order = searchParams.get("order") || "desc";
  const search = searchParams.get("search");
  const topic = searchParams.get("topic");

  const skip = (page - 1) * limit;

  const filters: Record<string, unknown> = {};

  if (chamber && chamber !== "both") {
    filters.billType = { startsWith: chamber.toLowerCase() };
  }

  if (status && statusMapping[status]) {
    filters.currentStatus = { in: statusMapping[status] };
  }

  if (momentum === "live") {
    filters.momentumTier = { in: LIVE_TIERS };
  } else if (momentum === "graveyard") {
    filters.momentumTier = { in: GRAVEYARD_TIERS };
  }
  // momentum === "all" applies no filter. Bills without a computed momentumTier
  // are excluded from "live" and "graveyard" — they'll appear once the cron
  // has computed their score.

  if (search) {
    filters.title = { contains: search, mode: "insensitive" };
  }

  if (topic) {
    filters.policyArea = { in: topic.split(",") };
  }

  // Sort order:
  //   relevant — momentum score primary, engagement + recency as tiebreakers.
  //              This is the "Trending" default: a live bill with any activity
  //              outranks a dormant bill no matter how many votes it has.
  //   latest   — latestActionDate desc. Shows what Congress actually did.
  //   newest   — introducedDate desc. Pure chronology.
  let orderBy: Record<string, unknown>[] | Record<string, unknown>;
  if (sortBy === "relevant") {
    orderBy = [
      { momentumScore: { sort: "desc", nulls: "last" } },
      { votes: { _count: "desc" } },
      { publicVotes: { _count: "desc" } },
      { comments: { _count: "desc" } },
      { latestActionDate: { sort: "desc", nulls: "last" } },
    ];
  } else if (sortBy === "latest") {
    orderBy = [{ latestActionDate: { sort: "desc", nulls: "last" } }];
  } else if (sortBy === "newest") {
    orderBy = [{ introducedDate: "desc" }];
  } else {
    orderBy = { [sortBy]: order };
  }

  try {
    // Counts for the banner: total in current filter + total hidden by momentum.
    // We compute these in parallel with the page fetch. The "hidden" count is
    // the total that would appear under momentum=all minus the total under
    // the active filter.
    const filtersAllMomentum = { ...filters };
    delete (filtersAllMomentum as Record<string, unknown>).momentumTier;

    const [total, totalAllMomentum, bills] = await Promise.all([
      prisma.bill.count({ where: filters }),
      momentum === "all"
        ? Promise.resolve(0)
        : prisma.bill.count({ where: filtersAllMomentum }),
      prisma.bill.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          billId: true,
          title: true,
          date: true,
          billType: true,
          currentChamber: true,
          currentStatus: true,
          currentStatusDate: true,
          introducedDate: true,
          link: true,
          shortText: true,
          sponsor: true,
          policyArea: true,
          latestActionText: true,
          latestActionDate: true,
          momentumTier: true,
          momentumScore: true,
          daysSinceLastAction: true,
          deathReason: true,
          _count: {
            select: {
              publicVotes: true,
              comments: true,
            },
          },
        },
      }),
    ]);

    const hiddenByMomentum =
      momentum === "all" ? 0 : Math.max(0, totalAllMomentum - total);

    // Truncate summaries for the listing — full CRS summaries can be 100KB+.
    // The card only shows a 2-line teaser; full text is still available on the
    // bill detail page.
    const trimmed = bills.map((b) => {
      const { _count, ...rest } = b;
      return {
        ...rest,
        shortText: b.shortText ? b.shortText.slice(0, 280) : null,
        publicVoteCount: _count.publicVotes,
        commentCount: _count.comments,
      };
    });

    return NextResponse.json({
      total,
      page,
      pageSize: limit,
      bills: trimmed,
      hiddenByMomentum,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "api_error",
        route: "GET /api/bills",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    reportError(error, { route: "GET /api/bills", filters, sortBy });
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 },
    );
  }
}
