"use client";

import Link, { useLinkStatus } from "next/link";
import { useState } from "react";
import dayjs from "dayjs";
import type { BillSummary } from "@/types";
import { getTopicForPolicyArea } from "@/lib/topic-mapping";
import { formatBillNumber } from "@/lib/bill-grouping";

// Swaps the chevron for a spinner while this specific sub-row's Link is
// resolving the next route. Only renders when *this* Link is pending —
// Next 15.3+ scopes useLinkStatus() to the nearest ancestor Link.
function SubRowNavIndicator() {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span
        aria-busy="true"
        aria-label="Loading"
        className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-navy/20 border-t-navy/70 animate-spin"
      />
    );
  }
  return (
    <svg
      className="shrink-0 w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-navy transition-colors"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function statusStyle(status: string): { label: string; className: string } {
  if (status.startsWith("enacted_"))
    return { label: "Enacted", className: "bg-enacted-soft text-enacted" };
  if (
    status === "passed_bill" ||
    status.startsWith("conference_") ||
    status === "passed_simpleres" ||
    status === "passed_concurrentres"
  )
    return { label: "Passed", className: "bg-passed-soft text-passed" };
  if (status.startsWith("pass_over_") || status.startsWith("pass_back_"))
    return { label: "In Progress", className: "bg-passed-soft text-passed" };
  if (status.startsWith("prov_kill_") && status !== "prov_kill_veto")
    return { label: "Stalled", className: "bg-muted text-foreground/60" };
  if (
    status.startsWith("fail_") ||
    status.startsWith("vetoed_") ||
    status === "prov_kill_veto"
  )
    return { label: "Failed", className: "bg-failed-soft text-failed" };
  if (status === "reported")
    return { label: "In Committee", className: "bg-muted text-foreground/70" };
  return { label: "Introduced", className: "bg-muted text-foreground/70" };
}

export function BillGroupCard({
  bills,
  votedBillIds,
}: {
  bills: BillSummary[];
  votedBillIds: Set<number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const lead = bills[0];
  const topic = getTopicForPolicyArea(lead.policyArea);
  const chamberIsHouse = lead.billType.startsWith("house");
  const status = statusStyle(lead.currentStatus);
  const displayDate = lead.latestActionDate || lead.introducedDate;
  const votedCount = bills.filter((b) => votedBillIds.has(b.id)).length;
  const allVoted = votedCount === bills.length;

  return (
    <div className="relative rounded-lg border border-border/50 bg-white hover:border-navy/25 hover:shadow-[0_2px_12px_rgba(10,31,68,0.1)] transition-all">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
          chamberIsHouse ? "bg-house/70" : "bg-senate/70"
        }`}
      />

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left px-5 py-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
      >
        <div className="pl-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-medium leading-snug text-navy line-clamp-2 flex-1">
              {lead.title}
            </h3>
            {allVoted && (
              <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-navy/8 text-navy/80 border border-navy/10">
                <svg
                  className="w-2.5 h-2.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Voted
              </span>
            )}
            <svg
              className={`shrink-0 w-4 h-4 mt-0.5 text-muted-foreground/60 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span
              className={`text-xs font-bold tracking-wider uppercase ${
                chamberIsHouse ? "text-house" : "text-senate"
              }`}
            >
              {chamberIsHouse ? "House" : "Senate"}
            </span>
            {topic && (
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${topic.color}`}
              >
                {topic.label}
              </span>
            )}
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}
            >
              {status.label}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-navy/8 text-navy/80 border border-navy/10">
              <svg
                className="w-3 h-3"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              {bills.length} related
              {!allVoted && votedCount > 0 && (
                <span className="text-muted-foreground/80">
                  · {votedCount}/{bills.length} voted
                </span>
              )}
            </span>
            {lead.sponsor && (
              <span className="text-xs text-muted-foreground">
                {lead.sponsor}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {dayjs(displayDate).format("MMM D, YYYY")}
            </span>
          </div>
        </div>
      </button>

      {expanded && (() => {
        // When all sub-rows would show the same boilerplate summary (or all
        // null), repeating it in every row adds noise without information.
        // This is the common case for legally-identical-template resolutions
        // like arms-sale disapprovals, where the CRS summary is identical
        // across siblings. Hide the secondary line in that case.
        const summaries = bills.map((b) => b.shortText ?? b.latestActionText ?? null);
        const firstSummary = summaries[0];
        const allSame = summaries.every((s) => s === firstSummary);
        const showPerRowSummary = !allSame;
        return (
        <div className="border-t border-border/40 bg-muted/20 pl-6 pr-3 pt-2 pb-1.5 animate-fade-slide-up rounded-b-lg">
          <p className="text-[11px] text-muted-foreground/80 px-2 pb-1.5 leading-relaxed">
            Related bills filed together — tap any to see details.
          </p>
          <ul className="divide-y divide-border/30">
            {bills.map((b) => {
              const voted = votedBillIds.has(b.id);
              const detail = b.shortText || b.latestActionText;
              return (
                <li key={b.id}>
                  <Link
                    href={`/bills/${b.id}`}
                    className="group flex items-center gap-3 px-2 py-2.5 rounded-md hover:bg-white transition-colors"
                  >
                    <span className="text-xs font-mono font-semibold text-navy w-24 shrink-0">
                      {formatBillNumber(b.billType, b.billId)}
                    </span>
                    {showPerRowSummary && (
                      <span className="text-xs text-muted-foreground line-clamp-1 flex-1">
                        {detail ?? "No summary available yet."}
                      </span>
                    )}
                    {!showPerRowSummary && <span className="flex-1" />}
                    {voted && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-navy/70">
                        Voted
                      </span>
                    )}
                    <SubRowNavIndicator />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        );
      })()}
    </div>
  );
}
