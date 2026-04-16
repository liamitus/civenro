"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BillJourney } from "@/components/bills/bill-journey";
import type { JourneyStep } from "@/lib/bill-helpers";
import type { MomentumTier, DeathReason } from "@/types";

interface BillAboutProps {
  title: string;
  shortText: string | null;
  introducedDate: string;
  lastActionDate: string | null;
  link: string | null;
  typeLabel: string;
  typeDescription: string;
  statusHeadline: string;
  statusDetail: string;
  statusStyle: string;
  chamberStyle: string;
  journeySteps: JourneyStep[];
  /** Number of substantive bill versions after the introduced version. Used
   *  to warn users that the CRS summary may no longer describe current text. */
  amendmentCount: number;
  momentumTier: MomentumTier | null;
  daysSinceLastAction: number | null;
  deathReason: DeathReason | null;
}

function formatSilence(days: number): string {
  if (days < 14) return `${days} days`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const years = Math.floor(days / 365);
  const remMonths = Math.round((days - years * 365) / 30);
  return remMonths === 0
    ? `${years} year${years > 1 ? "s" : ""}`
    : `${years} year${years > 1 ? "s" : ""}, ${remMonths} month${remMonths > 1 ? "s" : ""}`;
}

interface MomentumBanner {
  title: string;
  body: string;
  tone: "dead" | "dormant" | "stalled" | "advancing" | "enacted";
}

function momentumBanner(
  tier: MomentumTier | null,
  days: number | null,
  reason: DeathReason | null,
): MomentumBanner | null {
  if (!tier) return null;
  const silence = days != null ? formatSilence(days) : null;

  switch (tier) {
    case "DEAD": {
      if (reason === "CONGRESS_ENDED")
        return {
          title: "This bill died when its Congress ended.",
          body: "Bills don't carry over between Congresses. Without re-introduction in a new session, it cannot advance.",
          tone: "dead",
        };
      if (reason === "FAILED_VOTE")
        return {
          title: "This bill failed on a recorded vote.",
          body: "A chamber voted it down. It cannot advance in this form.",
          tone: "dead",
        };
      if (reason === "VETOED")
        return {
          title: "This bill was vetoed and not overridden.",
          body: "The President vetoed this bill and Congress did not override. It cannot become law.",
          tone: "dead",
        };
      return {
        title: "This bill appears to be dead.",
        body: silence
          ? `No action has been recorded in ${silence}. The structural status shown below reflects an earlier milestone, not current activity.`
          : "No recent activity has been recorded. The structural status shown below reflects an earlier milestone.",
        tone: "dead",
      };
    }
    case "DORMANT":
      return {
        title: "This bill has gone quiet.",
        body: silence
          ? `No action in ${silence}. It hasn't officially died, but bills this inactive rarely revive.`
          : "No recent activity. Bills this inactive rarely revive.",
        tone: "dormant",
      };
    case "STALLED":
      return {
        title: "This bill is stalled.",
        body: silence
          ? `No action in ${silence}. It may still move, but has lost momentum.`
          : "No recent activity. It may still move, but has lost momentum.",
        tone: "stalled",
      };
    case "ADVANCING":
      return {
        title: "This bill is moving.",
        body: "It has cleared at least one chamber and is structurally advancing through Congress.",
        tone: "advancing",
      };
    case "ENACTED":
      return {
        title: "This bill became law.",
        body: "It has been enacted. The journey below shows how it got there.",
        tone: "enacted",
      };
    case "ACTIVE":
    default:
      return null;
  }
}

const BANNER_STYLES: Record<MomentumBanner["tone"], string> = {
  dead: "border-border/60 bg-muted/60 text-foreground/75",
  dormant: "border-border/60 bg-muted/40 text-foreground/80",
  stalled: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200",
  advancing: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
  enacted: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200",
};

export function BillAboutSection({
  title,
  shortText,
  introducedDate,
  lastActionDate,
  link,
  typeLabel,
  typeDescription,
  statusHeadline,
  statusDetail,
  statusStyle,
  chamberStyle,
  journeySteps,
  amendmentCount,
  momentumTier,
  daysSinceLastAction,
  deathReason,
}: BillAboutProps) {
  const [open, setOpen] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const longSummary = (shortText?.length ?? 0) > 400;
  const banner = momentumBanner(momentumTier, daysSinceLastAction, deathReason);
  const isInactive =
    momentumTier === "DEAD" ||
    momentumTier === "DORMANT" ||
    momentumTier === "STALLED";

  return (
    <header className="space-y-3">
      {/* Badges — status first (more important signal). When the bill is
          inactive we desaturate the structural status chip so the rosy
          "Passed" green doesn't contradict the dead/dormant banner below. */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={`${
            isInactive
              ? "bg-muted text-foreground/60 border-0"
              : statusStyle
          } text-xs font-semibold px-2.5 py-0.5`}
        >
          {statusHeadline}
        </Badge>
        <Badge variant="outline" className={`${chamberStyle} text-[11px]`}>
          {typeLabel}
        </Badge>
        {momentumTier === "DEAD" && (
          <Badge className="bg-foreground/80 text-background text-[11px] border-0">
            Dead
          </Badge>
        )}
        {momentumTier === "DORMANT" && (
          <Badge className="bg-muted-foreground/80 text-background text-[11px] border-0">
            Dormant
          </Badge>
        )}
        {momentumTier === "STALLED" && (
          <Badge className="bg-amber-500/80 text-white text-[11px] border-0">
            Stalled
          </Badge>
        )}
      </div>

      {/* Title */}
      <h1 className={`text-lg font-bold leading-tight ${isInactive ? "text-foreground/75" : ""}`}>
        {title}
      </h1>

      {/* Momentum banner — the highest-priority signal on this page when a
          bill is inactive. Tells the user what to actually believe about
          this bill's chances, regardless of structural status. */}
      {banner && (banner.tone === "dead" || banner.tone === "dormant" || banner.tone === "stalled") && (
        <div className={`rounded-lg border px-4 py-3 ${BANNER_STYLES[banner.tone]}`}>
          <p className="text-sm font-semibold leading-tight">{banner.title}</p>
          <p className="text-xs leading-relaxed mt-1 opacity-90">{banner.body}</p>
        </div>
      )}

      {/* Plain-language summary — always visible, with provenance label and
          amendment warning so users can judge how current the summary is. */}
      {shortText && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Summary · Congressional Research Service (nonpartisan)
          </p>
          {longSummary ? (
            summaryExpanded ? (
              <div className="relative">
                <div className="max-h-80 overflow-y-auto rounded-md border border-border/40 bg-muted/20 px-4 py-3 text-sm text-muted-foreground leading-relaxed scroll-smooth">
                  {shortText}
                </div>
                <button
                  onClick={() => setSummaryExpanded(false)}
                  className="mt-1.5 text-xs font-medium text-navy/70 hover:text-navy transition-colors"
                >
                  Show less
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                  {shortText}
                </p>
                <button
                  onClick={() => setSummaryExpanded(true)}
                  className="mt-1.5 text-xs font-medium text-navy/70 hover:text-navy transition-colors"
                >
                  Show full summary
                </button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {shortText}
            </p>
          )}
          {amendmentCount > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
              <svg
                className="h-3.5 w-3.5 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                />
              </svg>
              <span className="leading-relaxed">
                This summary describes the bill as introduced. It has been
                amended {amendmentCount === 1 ? "once" : `${amendmentCount} times`}{" "}
                since — the current text may differ.
                {link && (
                  <>
                    {" "}
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium underline underline-offset-2 hover:no-underline"
                    >
                      View latest version
                    </a>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Meta row — always visible */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Introduced {introducedDate}</span>
        {lastActionDate && <span>Last action {lastActionDate}</span>}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-flex items-center gap-1"
          >
            GovTrack
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>

      {/* Learn more toggle — only shown when collapsed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="text-xs font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
        >
          Learn more about this bill
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      )}

      {/* Expanded content */}
      {open && (
        <div className="rounded-xl border bg-card p-5 space-y-5 animate-fade-slide-up">
          {/* Journey stepper */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              Legislative Journey
            </p>
            <BillJourney steps={journeySteps} />
          </div>

          {/* Status explainer */}
          <div className="rounded-lg border-l-4 border-l-civic-gold bg-civic-cream/50 dark:bg-accent/30 px-4 py-3 space-y-1.5">
            <p className="text-sm font-medium">{statusHeadline}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {statusDetail}
            </p>
          </div>

          {/* Bill type */}
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">
              What is a {typeLabel.toLowerCase()}?
            </span>{" "}
            {typeDescription}
          </div>

          {/* Hide details — at the bottom of expanded content */}
          <button
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            Hide details
            <svg
              className="h-3 w-3 rotate-180"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </header>
  );
}
