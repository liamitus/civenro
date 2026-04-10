"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BillJourney } from "@/components/bills/bill-journey";
import type { JourneyStep } from "@/lib/bill-helpers";

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
}

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
}: BillAboutProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="space-y-3">
      {/* Badges — status first (more important signal) */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${statusStyle} text-xs font-semibold px-2.5 py-0.5`}>
          {statusHeadline}
        </Badge>
        <Badge variant="outline" className={`${chamberStyle} text-[11px]`}>
          {typeLabel}
        </Badge>
      </div>

      {/* Title */}
      <h1 className="text-lg font-bold leading-tight">
        {title}
      </h1>

      {/* Plain-language summary — always visible */}
      {shortText && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {shortText}
        </p>
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

      {/* Learn more toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-primary hover:underline cursor-pointer inline-flex items-center gap-1"
      >
        {open ? "Hide details" : "Learn more about this bill"}
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

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
        </div>
      )}
    </header>
  );
}
