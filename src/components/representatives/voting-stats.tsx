"use client";

import type { RepVotingStats, RepresentativeInfo } from "@/types";

interface VotingStatsProps {
  stats: RepVotingStats;
  rep: RepresentativeInfo;
}

export function VotingStats({ stats, rep }: VotingStatsProps) {
  const yeaPct =
    stats.yeaCount + stats.nayCount > 0
      ? Math.round(
          (stats.yeaCount / (stats.yeaCount + stats.nayCount)) * 100
        )
      : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold tracking-[0.15em] uppercase text-navy/70">
        Voting Activity
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border/60 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-navy">{stats.totalVotes}</p>
          <p className="text-xs text-muted-foreground mt-1">Votes Cast</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-navy">
            {stats.missedVotePct}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">Missed Votes</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-vote-yea">{stats.yeaCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Yea Votes</p>
        </div>

        <div className="rounded-lg border border-border/60 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-vote-nay">{stats.nayCount}</p>
          <p className="text-xs text-muted-foreground mt-1">Nay Votes</p>
        </div>
      </div>

      {/* Yea/Nay bar */}
      {stats.yeaCount + stats.nayCount > 0 && (
        <div className="rounded-lg border border-border/60 bg-white p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Yea {yeaPct}%</span>
            <span>Nay {100 - yeaPct}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-gray-100 flex">
            <div
              className="bg-vote-yea transition-all"
              style={{ width: `${yeaPct}%` }}
            />
            <div
              className="bg-vote-nay transition-all"
              style={{ width: `${100 - yeaPct}%` }}
            />
          </div>
        </div>
      )}

      {rep.link && (
        <a
          href={rep.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          View full voting record on GovTrack &rarr;
        </a>
      )}
    </div>
  );
}
