"use client";

import Link from "next/link";
import { partyColor } from "@/lib/representative-utils";
import { parseSponsorString } from "@/lib/sponsor";

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
        <div className="relative w-12 h-15 rounded-md overflow-hidden bg-muted flex-shrink-0">
          {rep?.bioguideId ? (
            <img
              src={`/api/photos/${rep.bioguideId}`}
              alt={displayName}
              className="w-full h-full object-cover object-[center_20%] select-none pointer-events-none"
              draggable={false}
              loading="lazy"
              onError={(e) => {
                const el = e.currentTarget;
                el.style.display = "none";
                el.parentElement!.querySelector("[data-fallback]")!.removeAttribute("hidden");
              }}
            />
          ) : null}
          <div
            data-fallback
            hidden={!!rep?.bioguideId}
            className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-semibold"
          >
            {parsed.firstName[0]}
            {parsed.lastName[0]}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-navy leading-snug">
              {displayName}
            </p>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${colors.badge}`}
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
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {chamberLabel} · {locationLabel}
          </p>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            {coalition}
          </p>
        </div>

        {rep && (
          <span className="hidden sm:inline-flex items-center text-xs text-muted-foreground group-hover:text-navy transition-colors">
            View profile
            <svg className="w-3 h-3 ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        className={`${baseClasses} group hover:shadow-md hover:border-navy/20 transition-all`}
      >
        {inner}
      </Link>
    );
  }

  return <div className={baseClasses}>{inner}</div>;
}
