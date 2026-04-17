import "server-only";
import { prisma } from "@/lib/prisma";
import { statusMapping } from "@/lib/status-mapping";
import type { BillSummary } from "@/types";

const LIVE_TIERS = ["ACTIVE", "ADVANCING", "ENACTED"];
const GRAVEYARD_TIERS = ["DEAD"];

export type BillsSortBy = "relevant" | "latest" | "newest";
export type BillsMomentum = "live" | "graveyard" | "all";
export type BillsChamber = "both" | "house" | "senate";

export interface BillsQueryInput {
  page: number;
  limit: number;
  chamber: BillsChamber;
  status: string;
  momentum: BillsMomentum;
  sortBy: BillsSortBy;
  search: string;
  /** Comma-separated policy areas. */
  topic: string;
}

export interface BillsQueryResult {
  total: number;
  page: number;
  pageSize: number;
  bills: BillSummary[];
  hiddenByMomentum: number;
}

/**
 * Canonical bill-listing query. Called by both `GET /api/bills` (for
 * client-side pagination) and the Bills page RSC (for page-1 prefetch).
 *
 * Keeping this in one place means the client and server agree on filter
 * semantics, sort tie-breakers, and the shape of what we return — the
 * queryKey-based TanStack cache only works if both producers emit
 * identical payloads.
 */
export async function fetchBillsPage(
  input: BillsQueryInput,
): Promise<BillsQueryResult> {
  const { page, limit, chamber, status, momentum, sortBy, search, topic } =
    input;
  const skip = (page - 1) * limit;

  const filters: Record<string, unknown> = {};

  if (chamber !== "both") {
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

  if (search) {
    filters.title = { contains: search, mode: "insensitive" };
  }

  if (topic) {
    filters.policyArea = { in: topic.split(",") };
  }

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
  } else {
    orderBy = [{ introducedDate: "desc" }];
  }

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

  // Serialise Date -> ISO string here so server (RSC prefetch) and client
  // (fetch /api/bills -> JSON) deliver identical payload shape. The grouping
  // helper + BillCard both call `.slice(0, 10)` on date fields, so passing
  // Date objects through (as RSC would by default) breaks at runtime.
  const iso = (d: Date | null) => (d ? d.toISOString() : null);
  const trimmed: BillSummary[] = bills.map((b) => {
    const {
      _count,
      date,
      currentStatusDate,
      introducedDate,
      latestActionDate,
      ...rest
    } = b;
    return {
      ...(rest as unknown as BillSummary),
      date: iso(date)!,
      currentStatusDate: iso(currentStatusDate),
      introducedDate: iso(introducedDate),
      latestActionDate: iso(latestActionDate),
      shortText: b.shortText ? b.shortText.slice(0, 280) : null,
      publicVoteCount: _count.publicVotes,
      commentCount: _count.comments,
    };
  });

  return {
    total,
    page,
    pageSize: limit,
    bills: trimmed,
    hiddenByMomentum,
  };
}
