"use client";

import Link, { useLinkStatus } from "next/link";
import dayjs from "dayjs";
import type { BillSummary, MomentumTier, DeathReason } from "@/types";
import { getTopicForPolicyArea } from "@/lib/topic-mapping";

// Navigation indicator: only renders when this specific Link has been clicked
// and the app is resolving the next route. Next.js 15.3+.
function CardNavIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <div
      aria-busy="true"
      className="absolute inset-0 rounded-lg ring-2 ring-navy/40 pointer-events-none"
    >
      <div className="absolute top-3 right-4 w-3.5 h-3.5 rounded-full border-2 border-navy/20 border-t-navy/70 animate-spin" />
    </div>
  );
}

function statusStyle(status: string): { label: string; className: string } {
  if (status.startsWith("enacted_"))
    return { label: "Enacted", className: "bg-enacted-soft text-enacted" };
  if (status === "passed_bill" || status.startsWith("conference_") ||
      status === "passed_simpleres" || status === "passed_concurrentres")
    return { label: "Passed", className: "bg-passed-soft text-passed" };
  if (status.startsWith("pass_over_") || status.startsWith("pass_back_"))
    return { label: "In Progress", className: "bg-passed-soft text-passed" };
  if (status.startsWith("prov_kill_") && status !== "prov_kill_veto")
    return { label: "Stalled", className: "bg-muted text-foreground/60" };
  if (status.startsWith("fail_") || status.startsWith("vetoed_") || status === "prov_kill_veto")
    return { label: "Failed", className: "bg-failed-soft text-failed" };
  if (status === "reported")
    return { label: "In Committee", className: "bg-muted text-foreground/70" };
  return { label: "Introduced", className: "bg-muted text-foreground/70" };
}

function chamberTag(billType: string): { label: string; className: string } | null {
  if (billType.startsWith("house"))
    return { label: "House", className: "text-house" };
  if (billType.startsWith("senate"))
    return { label: "Senate", className: "text-senate" };
  return null;
}

function formatSilence(days: number): string {
  if (days < 14) return `${days}d`;
  if (days < 60) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}

function deathLabel(reason: DeathReason | null): string {
  switch (reason) {
    case "CONGRESS_ENDED":
      return "Congress ended";
    case "FAILED_VOTE":
      return "Failed vote";
    case "VETOED":
      return "Vetoed";
    case "LONG_SILENCE":
      return "No action >1yr";
    default:
      return "Died";
  }
}

interface TierTreatment {
  // Applied to the card wrapper. Only the tier-specific tone.
  cardClass: string;
  // Optional chip shown next to the status chip.
  momentumChip?: { label: string; className: string };
  // Optional short microcopy about activity, shown on the meta row.
  silenceNote?: string;
}

function tierTreatment(
  tier: MomentumTier | null,
  daysSinceLastAction: number | null,
  deathReason: DeathReason | null,
): TierTreatment {
  const silence =
    daysSinceLastAction != null && daysSinceLastAction > 30
      ? `No action in ${formatSilence(daysSinceLastAction)}`
      : undefined;

  switch (tier) {
    case "DEAD":
      return {
        cardClass: "opacity-60 grayscale-[30%]",
        momentumChip: {
          label: deathLabel(deathReason),
          className: "bg-muted/70 text-foreground/60 border border-border/60",
        },
        silenceNote: silence,
      };
    case "DORMANT":
      return {
        cardClass: "opacity-75",
        momentumChip: {
          label: "Dormant",
          className: "bg-muted text-foreground/60",
        },
        silenceNote: silence,
      };
    case "STALLED":
      return {
        cardClass: "",
        momentumChip: {
          label: "Stalled",
          className: "bg-muted text-foreground/60",
        },
        silenceNote: silence,
      };
    case "ADVANCING":
      return {
        cardClass: "",
        momentumChip: {
          label: "Advancing",
          className: "bg-passed-soft text-passed",
        },
      };
    case "ENACTED":
    case "ACTIVE":
    case null:
    default:
      return { cardClass: "" };
  }
}

export function BillCard({ bill }: { bill: BillSummary }) {
  const status = statusStyle(bill.currentStatus);
  const chamber = chamberTag(bill.billType);
  const topic = getTopicForPolicyArea(bill.policyArea);
  const displayDate = bill.latestActionDate || bill.introducedDate;
  const treatment = tierTreatment(
    bill.momentumTier,
    bill.daysSinceLastAction,
    bill.deathReason,
  );

  return (
    <Link href={`/bills/${bill.id}`} className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2 active:scale-[0.997] transition-transform">
      <div className={`relative px-5 py-4 rounded-lg border border-border/50 bg-white hover:border-navy/25 hover:shadow-[0_2px_12px_rgba(10,31,68,0.1)] transition-all duration-200 ${treatment.cardClass}`}>
        <CardNavIndicator />
        {/* Chamber indicator line */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
            bill.billType.startsWith("house") ? "bg-house/70" : bill.billType.startsWith("senate") ? "bg-senate/70" : "bg-muted"
          }`}
        />

        <div className="pl-3">
          <h3 className="text-sm font-medium leading-snug text-navy line-clamp-2 group-hover:text-navy-light transition-colors">
            {bill.title}
          </h3>

          {bill.shortText && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {bill.shortText}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {chamber && (
              <span className={`text-xs font-bold tracking-wider uppercase ${chamber.className}`}>
                {chamber.label}
              </span>
            )}
            {topic && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${topic.color}`}>
                {topic.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {treatment.momentumChip && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${treatment.momentumChip.className}`}
              >
                {treatment.momentumChip.label}
              </span>
            )}
            {bill.sponsor && (
              <span className="text-xs text-muted-foreground">
                {bill.sponsor}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {dayjs(displayDate).format("MMM D, YYYY")}
            </span>
            {treatment.silenceNote && (
              <span className="text-xs italic text-muted-foreground/70">
                {treatment.silenceNote}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
