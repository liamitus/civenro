"use client";

import dayjs from "dayjs";

interface VoteHistoryEntry {
  voteType: string;
  createdAt: string;
  versionCode: string | null;
  versionType: string | null;
}

export function VoteHistorySection({ history }: { history: VoteHistoryEntry[] }) {
  // Only show if there are 2+ entries (single entry = no re-votes, not interesting)
  if (history.length < 2) return null;

  return (
    <div className="pt-3 border-t border-border/30">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
        Your vote history
      </p>
      <div className="space-y-1">
        {history.map((entry, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {dayjs(entry.createdAt).format("MMM D, YYYY")}
            </span>
            <span className="text-foreground/70">—</span>
            <span className="font-medium text-foreground/80">
              {entry.voteType}
            </span>
            {entry.versionType && (
              <span className="text-muted-foreground">
                ({entry.versionType})
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
