"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RepVoteRecord } from "@/types";

interface RepKeyVotesProps {
  keyVotes: RepVoteRecord[];
  repFirstName: string;
}

export function RepKeyVotes({ keyVotes, repFirstName }: RepKeyVotesProps) {
  if (keyVotes.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/70">
        Key Votes
      </h2>
      <p className="text-xs text-muted-foreground -mt-1">
        How {repFirstName} voted on final passage of bills
      </p>

      <div className="space-y-2">
        {keyVotes.map((vote) => (
          <div
            key={`${vote.billId}-${vote.date}`}
            className="flex items-center gap-3 rounded-lg border border-border/60 bg-white p-3 sm:p-4"
          >
            <Badge
              className={
                vote.repVote === "Yea"
                  ? "bg-vote-yea text-white flex-shrink-0"
                  : "bg-vote-nay text-white flex-shrink-0"
              }
            >
              {vote.repVote === "Yea" ? "YES" : "NO"}
            </Badge>

            <div className="flex-1 min-w-0">
              <Link
                href={`/bills/${vote.billId}`}
                className="text-sm font-medium text-navy hover:underline leading-snug line-clamp-2"
              >
                {vote.title}
              </Link>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(vote.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
