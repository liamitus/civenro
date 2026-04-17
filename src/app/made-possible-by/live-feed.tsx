"use client";

import { useEffect, useState } from "react";

type FeedDonor = {
  id: string;
  displayName: string | null;
  tributeName: string | null;
  displayMode: string;
  regionCode: string | null;
  createdAt: string | Date;
};

function formatRegion(code: string | null): string {
  if (!code) return "";
  // "US-OH" → "Ohio"
  const state = code.replace("US-", "");
  try {
    return (
      new Intl.DisplayNames("en-US", { type: "region" }).of(`US-${state}`) ??
      state
    );
  } catch {
    return state;
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function donorLabel(d: FeedDonor): string {
  if (d.displayMode === "TRIBUTE" && d.tributeName) {
    return `In honor of ${d.tributeName}`;
  }
  if (d.displayMode === "NAMED" && d.displayName) {
    return d.displayName;
  }
  const region = formatRegion(d.regionCode);
  return region ? `A citizen from ${region}` : "A citizen";
}

export function LiveFeed({ donors }: { donors: FeedDonor[] }) {
  const [now, setNow] = useState(Date.now());

  // Update relative times every 30s
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  // Suppress hydration warnings from time-dependent rendering
  void now;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
        </span>
        <h2 className="text-muted-foreground text-sm font-medium tracking-wide uppercase">
          Recent
        </h2>
      </div>
      <div className="space-y-1.5">
        {donors.map((d) => (
          <div
            key={d.id}
            className="animate-fade-slide-up flex items-center justify-between py-1.5 text-sm"
          >
            <span className="text-foreground">{donorLabel(d)}</span>
            <span className="text-muted-foreground ml-3 text-xs whitespace-nowrap">
              {timeAgo(new Date(d.createdAt))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
