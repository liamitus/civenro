"use client";

import dayjs from "dayjs";
import type { VoteType } from "@/types";

interface StaleVoteBannerProps {
  currentVote: VoteType;
  votedOnVersion: {
    versionCode: string;
    versionType: string;
    versionDate: string;
  } | null;
  currentVersion: {
    versionCode: string;
    versionType: string;
    versionDate: string;
  };
  changeSummary: string | null;
  onReVote: (voteType: VoteType) => void;
  onConfirm: () => void;
  submitting: boolean;
}

const VOTE_OPTIONS: VoteType[] = ["For", "Against", "Abstain"];

export function StaleVoteBanner({
  currentVote,
  votedOnVersion,
  currentVersion,
  changeSummary,
  onReVote,
  onConfirm,
  submitting,
}: StaleVoteBannerProps) {
  const otherOptions = VOTE_OPTIONS.filter((v) => v !== currentVote);

  return (
    <div className="rounded-lg border border-civic-gold/30 bg-civic-gold/5 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <svg
          className="h-5 w-5 text-civic-gold shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            This bill has been updated since your vote
          </p>

          <p className="text-xs text-muted-foreground">
            You voted{" "}
            <span className="font-semibold text-foreground">{currentVote}</span>
            {votedOnVersion ? (
              <>
                {" "}on the &ldquo;{votedOnVersion.versionType}&rdquo; version
                ({dayjs(votedOnVersion.versionDate).format("MMM D, YYYY")})
              </>
            ) : (
              <> before version tracking was available</>
            )}
            . The bill is now in its &ldquo;{currentVersion.versionType}&rdquo;
            version ({dayjs(currentVersion.versionDate).format("MMM D, YYYY")}).
          </p>

          {changeSummary ? (
            <div className="text-xs text-muted-foreground pl-3 border-l-2 border-civic-gold/40">
              <span className="font-medium text-foreground/80">What changed: </span>
              {changeSummary}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              A summary of changes is being prepared.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={onConfirm}
          disabled={submitting}
          className="px-3 py-1.5 rounded-md text-xs font-medium bg-navy text-white hover:bg-navy-light transition-colors disabled:opacity-50"
        >
          Keep My Vote: {currentVote}
        </button>
        {otherOptions.map((option) => (
          <button
            key={option}
            onClick={() => onReVote(option)}
            disabled={submitting}
            className="px-3 py-1.5 rounded-md text-xs font-medium border border-border/60 text-muted-foreground hover:text-foreground hover:border-navy/30 transition-colors disabled:opacity-50"
          >
            Change to {option}
          </button>
        ))}
      </div>
    </div>
  );
}
