"use client";

import { useState } from "react";
import type { RepVoteRecord } from "@/types";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { AuthModal } from "@/components/auth/auth-modal";

interface AlignmentScoreProps {
  votingRecord: RepVoteRecord[];
  userVotes: Record<number, string> | null;
  repName: string;
}

function computeAlignment(
  votingRecord: RepVoteRecord[],
  userVotes: Record<number, string> | null
) {
  if (!userVotes) return { aligned: 0, comparable: 0, pct: null };

  let comparable = 0;
  let aligned = 0;

  for (const bill of votingRecord) {
    const userVote = userVotes[bill.billId];
    if (!userVote || userVote === "Abstain") continue;
    if (bill.repVote === "Present" || bill.repVote === "Not Voting") continue;

    comparable++;
    if (
      (userVote === "For" && bill.repVote === "Yea") ||
      (userVote === "Against" && bill.repVote === "Nay")
    ) {
      aligned++;
    }
  }

  return {
    aligned,
    comparable,
    pct: comparable > 0 ? Math.round((aligned / comparable) * 100) : null,
  };
}

function EmptyDonut() {
  return (
    <div className="relative flex-shrink-0">
      <div
        className="w-36 h-36 rounded-full flex items-center justify-center"
        style={{
          background: "conic-gradient(#E5E7EB 0deg 360deg)",
        }}
      >
        <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-300">—</span>
        </div>
      </div>
    </div>
  );
}

export function AlignmentScore({
  votingRecord,
  userVotes,
  repName,
}: AlignmentScoreProps) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const { aligned, comparable, pct } = computeAlignment(
    votingRecord,
    userVotes
  );

  // Not logged in — show preview donut + sign in CTA
  if (!user) {
    return (
      <>
        <div className="rounded-xl border border-border/60 bg-white p-8">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <EmptyDonut />

            <div className="text-center sm:text-left">
              <p className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/50 mb-2">
                Alignment Score
              </p>
              <p className="text-lg font-bold text-navy mb-1">
                How well does {repName} represent you?
              </p>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm">
                Sign in and vote on bills to see a personalized alignment score
                comparing your positions with this representative&apos;s voting
                record.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="inline-flex h-10 px-5 items-center rounded-md bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors"
              >
                Sign in to see your score
              </button>
            </div>
          </div>
        </div>

        <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      </>
    );
  }

  // Logged in but no overlapping votes
  if (pct === null) {
    return (
      <div className="rounded-xl border border-border/60 bg-white p-8">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <EmptyDonut />

          <div className="text-center sm:text-left">
            <p className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/50 mb-2">
              Alignment Score
            </p>
            <p className="text-lg font-bold text-navy mb-1">
              No alignment data yet
            </p>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Vote on bills to see how your positions compare with{" "}
              {repName}&apos;s voting record. The more bills you vote on, the
              more accurate your score.
            </p>
            <Link
              href="/bills"
              className="inline-flex h-10 px-5 items-center rounded-md bg-navy text-white text-sm font-medium hover:bg-navy-light transition-colors"
            >
              Browse bills to vote on
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Has alignment data
  const alignedDeg = (pct / 100) * 360;
  const color =
    pct >= 60
      ? "var(--color-vote-yea)"
      : pct >= 40
        ? "var(--color-vote-present)"
        : "var(--color-vote-nay)";

  return (
    <div className="rounded-xl border border-border/60 bg-white p-8">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        {/* Donut */}
        <div className="relative flex-shrink-0">
          <div
            className="w-36 h-36 rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(${color} 0deg ${alignedDeg}deg, #E5E7EB ${alignedDeg}deg 360deg)`,
            }}
          >
            <div className="w-28 h-28 rounded-full bg-white flex items-center justify-center">
              <span className="text-3xl font-bold" style={{ color }}>
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Text */}
        <div>
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/50 mb-2">
            Alignment Score
          </p>
          <p className="text-xl font-bold text-navy mb-1">{pct}% Aligned</p>
          <p className="text-sm text-muted-foreground">
            Out of {comparable} bill{comparable !== 1 ? "s" : ""} you&apos;ve
            both voted on, you agreed on {aligned}.
          </p>
        </div>
      </div>
    </div>
  );
}
