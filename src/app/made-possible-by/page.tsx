import { prisma } from "@/lib/prisma";
import { LiveFeed } from "./live-feed";
import { DonorGrid } from "./donor-grid";
import Link from "next/link";

export const metadata = {
  title: "Made Possible By — Civenro",
  description: "Civenro is funded by readers. Meet the citizens keeping civic transparency alive.",
};

export const revalidate = 300; // 5 min cache

/** Deterministic daily shuffle so the order is stable for a day but fair over time. */
function dailyShuffle<T>(arr: T[]): T[] {
  const seed = new Date().toISOString().slice(0, 10); // "2026-04-10"
  const out = [...arr];
  // Simple seeded Fisher-Yates using a hash of the date string
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h, 1597334677) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type DonorRow = {
  id: string;
  displayName: string | null;
  tributeName: string | null;
  displayMode: string;
  regionCode: string | null;
  createdAt: Date;
};

const DONOR_SELECT = {
  id: true,
  displayName: true,
  tributeName: true,
  displayMode: true,
  regionCode: true,
  createdAt: true,
} as const;

export default async function MadePossibleByPage() {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [recentDonors, sustainers, supporters, tributes, anonCount, totalCount] =
    await Promise.all([
      // Live feed — last 24h, max 10
      prisma.donation.findMany({
        where: {
          moderationStatus: "APPROVED",
          hiddenAt: null,
          createdAt: { gte: twentyFourHoursAgo },
        },
        orderBy: { createdAt: "desc" },
        select: DONOR_SELECT,
        take: 10,
      }),
      // Sustainers — active recurring donors
      prisma.donation.findMany({
        where: {
          moderationStatus: "APPROVED",
          hiddenAt: null,
          isRecurring: true,
          recurringStatus: { in: ["ACTIVE", "GRACE"] },
          displayMode: { not: "ANONYMOUS" },
        },
        select: DONOR_SELECT,
      }),
      // Named one-time supporters
      prisma.donation.findMany({
        where: {
          moderationStatus: "APPROVED",
          hiddenAt: null,
          isRecurring: false,
          displayMode: "NAMED",
        },
        select: DONOR_SELECT,
      }),
      // Tribute donations
      prisma.donation.findMany({
        where: {
          moderationStatus: "APPROVED",
          hiddenAt: null,
          displayMode: "TRIBUTE",
        },
        select: DONOR_SELECT,
      }),
      // Anonymous count
      prisma.donation.count({
        where: {
          moderationStatus: { in: ["APPROVED", "PENDING"] },
          hiddenAt: null,
          displayMode: "ANONYMOUS",
        },
      }),
      // Total count
      prisma.donation.count({
        where: {
          moderationStatus: { in: ["APPROVED", "PENDING"] },
          hiddenAt: null,
        },
      }),
    ]);

  const shuffledSustainers = dailyShuffle(sustainers);
  const shuffledSupporters = dailyShuffle(supporters);
  const shuffledTributes = dailyShuffle(tributes);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 space-y-10">
      {/* Header */}
      <header className="text-center space-y-3">
        <p className="text-civic-gold text-sm tracking-widest uppercase star-accent">
          Made Possible By
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {totalCount.toLocaleString()} citizens keep Civenro running.
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          No ads. No corporate sponsors. Just people who believe civic
          transparency matters.
        </p>
      </header>

      {/* Live feed — recent donations in last 24h */}
      {recentDonors.length > 0 && (
        <LiveFeed donors={recentDonors} />
      )}

      {/* Sustainers — recurring donors */}
      {shuffledSustainers.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Sustainers</h2>
            <span className="text-xs bg-civic-gold/10 text-civic-gold px-2 py-0.5 rounded-full font-medium">
              Monthly
            </span>
          </div>
          <DonorGrid donors={shuffledSustainers} />
        </section>
      )}

      {/* Named one-time supporters */}
      {shuffledSupporters.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">Supporters</h2>
          <DonorGrid donors={shuffledSupporters} />
        </section>
      )}

      {/* Tributes */}
      {shuffledTributes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-lg">In Honor Of</h2>
          <div className="grid gap-2">
            {shuffledTributes.map((d) => (
              <div
                key={d.id}
                className="text-sm text-muted-foreground italic"
              >
                In honor of{" "}
                <span className="text-foreground not-italic font-medium">
                  {d.tributeName}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Anonymous aggregate */}
      {anonCount > 0 && (
        <p className="text-center text-muted-foreground font-medium text-base">
          + {anonCount.toLocaleString()} anonymous citizen
          {anonCount !== 1 ? "s" : ""}
        </p>
      )}

      {/* CTA */}
      <div className="text-center pt-4">
        <Link
          href="/support"
          className="inline-flex items-center gap-2 bg-navy text-white px-6 py-3 rounded-md text-sm font-semibold tracking-wide hover:bg-navy-light transition-colors"
        >
          Join them
        </Link>
      </div>
    </div>
  );
}
