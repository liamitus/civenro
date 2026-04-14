"use client";

import { useEffect, useState } from "react";
import type { RepresentativeDetailResponse } from "@/types";
import { AlignmentScore } from "./alignment-score";
import { VoteComparisonFeed } from "./vote-comparison-feed";
import { RepQuickStats } from "./rep-quick-stats";
import { RepKeyVotes } from "./rep-key-votes";

interface RepDetailInteractiveProps {
  bioguideId: string;
}

export function RepDetailInteractive({
  bioguideId,
}: RepDetailInteractiveProps) {
  const [data, setData] = useState<RepresentativeDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/representatives/${bioguideId}`);
        if (!res.ok) throw new Error("Failed to fetch");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Failed to load representative data.");
      }
      setLoading(false);
    }
    fetchData();
  }, [bioguideId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
        {error || "Something went wrong."}
      </div>
    );
  }

  const repName = `${data.representative.firstName} ${data.representative.lastName}`;

  return (
    <div className="space-y-8">
      {/* Quick stats — the "report card" at a glance */}
      <RepQuickStats
        stats={data.stats}
        sponsoredBillsCount={data.sponsoredBillsCount}
      />

      {/* Key votes — what matters most to a casual visitor */}
      <RepKeyVotes
        keyVotes={data.keyVotes}
        repFirstName={data.representative.firstName}
      />

      {/* Alignment — personalized for logged-in users, CTA for logged-out */}
      <AlignmentScore
        votingRecord={data.votingRecord}
        userVotes={data.userVotes}
        repName={repName}
      />

      {/* Full voting record — collapsed by default, expandable */}
      <VoteComparisonFeed
        votingRecord={data.votingRecord}
        userVotes={data.userVotes}
      />

      {/* External links */}
      {data.representative.link && (
        <div className="text-center pt-2 pb-4">
          <a
            href={data.representative.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-navy transition-colors"
          >
            View full record on GovTrack &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
