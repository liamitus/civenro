"use client";

import Link from "next/link";
import { partyColor } from "@/lib/representative-utils";
import { parseSponsorString } from "@/lib/sponsor";
import { RepPhoto } from "@/components/representatives/rep-photo";

type RepMatch = {
  bioguideId: string;
  slug: string | null;
  firstName: string;
  lastName: string;
} | null;

interface SponsorCardProps {
  /** Raw sponsor text string from `Bill.sponsor`. */
  sponsor: string | null;
  /** Matched Representative row, if we were able to join on name+state. */
  rep: RepMatch;
  /** Coalition context: "15 R, 12 D" or similar. Null when no cosponsors. */
  cosponsorPartySplit: string | null;
  cosponsorCount: number | null;
}

/** Render a human-readable coalition summary from the split string. */
function coalitionLine(
  count: number | null,
  split: string | null,
  sponsorParty: string | null,
): string {
  if (!count || count === 0) return "Introduced solo — no cosponsors yet.";

  // Parse "X D, Y R" into counts to decide "mostly D" / "bipartisan" / etc.
  const d = /(\d+)\s*D/.exec(split ?? "")?.[1];
  const r = /(\d+)\s*R/.exec(split ?? "")?.[1];
  const dN = d ? parseInt(d, 10) : 0;
  const rN = r ? parseInt(r, 10) : 0;
  const minority = Math.min(dN, rN);

  // Bipartisan threshold: ≥3 from the minority party (same heuristic as
  // momentum scoring in src/lib/momentum.ts)
  if (minority >= 3) {
    return `Bipartisan — ${count} cosponsor${count === 1 ? "" : "s"} (${split})`;
  }

  if (dN > 0 && rN > 0) {
    const leaning = dN > rN ? "mostly Democrats" : "mostly Republicans";
    return `${count} cosponsor${count === 1 ? "" : "s"} — ${leaning}`;
  }

  if (split) {
    // Single-party run: "14 R" or "5 D"
    const partyWord =
      sponsorParty === "R"
        ? "all Republican"
        : sponsorParty === "D"
          ? "all Democrat"
          : split;
    return `${count} cosponsor${count === 1 ? "" : "s"} — ${partyWord}`;
  }

  return `${count} cosponsor${count === 1 ? "" : "s"}`;
}

export function SponsorCard({
  sponsor,
  rep,
  cosponsorPartySplit,
  cosponsorCount,
}: SponsorCardProps) {
  const parsed = parseSponsorString(sponsor);
  if (!parsed) return null;

  const colors = partyColor(
    parsed.party === "R"
      ? "Republican"
      : parsed.party === "D"
        ? "Democrat"
        : parsed.party === "I"
          ? "Independent"
          : parsed.party,
  );

  const chamberLabel =
    parsed.chamberPrefix === "Sen."
      ? "U.S. Senator"
      : parsed.chamberPrefix === "Del."
        ? "Delegate"
        : parsed.chamberPrefix === "Res.Comm."
          ? "Resident Commissioner"
          : "U.S. Representative";

  const locationLabel = `${parsed.state}${parsed.district ? `-${parsed.district}` : ""}`;
  const coalition = coalitionLine(
    cosponsorCount,
    cosponsorPartySplit,
    parsed.party,
  );

  const displayName = `${parsed.firstName} ${parsed.lastName}`;

  // When we have a matched Representative row: link-wrapped card with photo.
  // When we don't (prior Congress, name mismatch): static card with initials.
  const inner = (
    <>
      <div className="flex items-center gap-3">
        <div className="bg-muted relative h-15 w-12 flex-shrink-0 overflow-hidden rounded-md">
          <RepPhoto
            bioguideId={rep?.bioguideId ?? null}
            firstName={parsed.firstName}
            lastName={parsed.lastName}
            alt={displayName}
            imgClassName="object-[center_20%]"
            fallbackClassName="text-sm font-semibold"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-navy text-sm leading-snug font-semibold">
              {displayName}
            </p>
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ${colors.badge}`}
            >
              {parsed.party === "D"
                ? "Democrat"
                : parsed.party === "R"
                  ? "Republican"
                  : parsed.party === "I"
                    ? "Independent"
                    : parsed.party}
            </span>
          </div>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {chamberLabel} · {locationLabel}
          </p>
          <p className="text-muted-foreground/80 mt-1 text-[11px]">
            {coalition}
          </p>
        </div>

        {rep && (
          <span className="text-muted-foreground group-hover:text-navy hidden items-center text-xs transition-colors sm:inline-flex">
            View profile
            <svg
              className="ml-1 h-3 w-3"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </span>
        )}
      </div>
    </>
  );

  const baseClasses = `relative block rounded-lg bg-white border border-border/60 overflow-hidden ${colors.bar} px-4 py-3`;

  if (rep) {
    return (
      <Link
        href={`/representatives/${rep.slug || rep.bioguideId}`}
        className={`${baseClasses} group hover:border-navy/20 transition-all hover:shadow-md`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={baseClasses}>{inner}</div>;
}
