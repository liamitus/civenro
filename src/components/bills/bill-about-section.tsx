"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { BillJourney } from "@/components/bills/bill-journey";
import { AiChatbox } from "@/components/chat/ai-chatbox";
import type { JourneyStep } from "@/lib/bill-helpers";

interface BillAboutProps {
  billId: number;
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
  billId,
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
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={chamberStyle}>
          {typeLabel}
        </Badge>
        <Badge className={statusStyle}>{statusHeadline}</Badge>
      </div>

      {/* Clickable title — toggles the about section */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left group cursor-pointer"
      >
        <div className="flex items-start gap-2">
          <h1 className="text-lg font-bold leading-tight group-hover:text-primary transition-colors flex-1">
            {title}
          </h1>
          <svg
            className={`h-5 w-5 mt-1 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        {!open && (
          <p className="text-xs text-muted-foreground mt-1">
            Tap to learn more about this legislation
          </p>
        )}
      </button>

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

      {/* Expanded content */}
      {open && (
        <div className="rounded-xl border bg-card p-5 space-y-5 animate-fade-slide-up">
          {/* Short summary */}
          {shortText && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {shortText}
            </p>
          )}

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

          {/* AI Chat — lives here with the bill context */}
          <div className="border-t pt-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Ask AI About This Bill
            </p>
            <AiChatbox billId={billId} />
          </div>
        </div>
      )}
    </header>
  );
}
