"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RepVoteRecord } from "@/types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface VoteComparisonFeedProps {
  votingRecord: RepVoteRecord[];
  userVotes: Record<number, string> | null;
}

type Filter = "all" | "matches" | "mismatches";

function getMatchStatus(
  repVote: string,
  userVote: string | undefined
): "match" | "mismatch" | "none" {
  if (!userVote || userVote === "Abstain") return "none";
  if (repVote === "Present" || repVote === "Not Voting") return "none";

  if (
    (userVote === "For" && repVote === "Yea") ||
    (userVote === "Against" && repVote === "Nay")
  ) {
    return "match";
  }
  return "mismatch";
}

function repVoteBadgeClass(vote: string): string {
  switch (vote) {
    case "Yea":
      return "bg-vote-yea text-white";
    case "Nay":
      return "bg-vote-nay text-white";
    case "Present":
      return "bg-vote-present text-white";
    default:
      return "bg-gray-300 text-gray-700";
  }
}

function userVoteBadgeClass(vote: string): string {
  switch (vote) {
    case "For":
      return "bg-vote-yea text-white";
    case "Against":
      return "bg-vote-nay text-white";
    default:
      return "bg-gray-300 text-gray-700";
  }
}

export function VoteComparisonFeed({
  votingRecord,
  userVotes,
}: VoteComparisonFeedProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = votingRecord.filter((bill) => {
    if (filter === "all") return true;
    const status = getMatchStatus(bill.repVote, userVotes?.[bill.billId]);
    if (filter === "matches") return status === "match";
    if (filter === "mismatches") return status === "mismatch";
    return true;
  });

  const matchCount = votingRecord.filter(
    (b) => getMatchStatus(b.repVote, userVotes?.[b.billId]) === "match"
  ).length;
  const mismatchCount = votingRecord.filter(
    (b) => getMatchStatus(b.repVote, userVotes?.[b.billId]) === "mismatch"
  ).length;

  const displayItems = expanded ? filtered : filtered.slice(0, 5);
  const hasMore = filtered.length > 5;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/70">
          Full Voting Record
        </h2>
        {userVotes && (
          <div className="flex gap-1">
            {(
              [
                ["all", `All (${votingRecord.length})`],
                ["matches", `Matches (${matchCount})`],
                ["mismatches", `Mismatches (${mismatchCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  filter === key
                    ? "bg-navy text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No votes to display.
        </p>
      ) : (
        <div className="space-y-2">
          {displayItems.map((bill) => {
            const userVote = userVotes?.[bill.billId];
            const status = getMatchStatus(bill.repVote, userVote);
            const rowBg =
              status === "match"
                ? "bg-vote-yea/5 border-vote-yea/20"
                : status === "mismatch"
                  ? "bg-vote-nay/5 border-vote-nay/20"
                  : "bg-white border-border/60";

            return (
              <div
                key={bill.billId}
                className={`rounded-lg border p-4 ${rowBg} transition-colors`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/bills/${bill.billId}`}
                      className="text-sm font-medium text-navy hover:underline leading-snug line-clamp-2"
                    >
                      {bill.title}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(bill.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                        Rep
                      </p>
                      <Badge className={repVoteBadgeClass(bill.repVote)}>
                        {bill.repVote}
                      </Badge>
                    </div>

                    {userVotes && (
                      <>
                        <div className="text-center">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                            You
                          </p>
                          {userVote ? (
                            <Badge className={userVoteBadgeClass(userVote)}>
                              {userVote}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </div>

                        <div className="w-6 text-center">
                          {status === "match" && (
                            <span className="text-vote-yea text-lg">&#10003;</span>
                          )}
                          {status === "mismatch" && (
                            <span className="text-vote-nay text-lg">&#10007;</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mx-auto text-sm text-navy/70 hover:text-navy transition-colors py-2"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show all {filtered.length} votes <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
