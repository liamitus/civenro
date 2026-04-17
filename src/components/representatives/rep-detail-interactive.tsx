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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-muted h-20 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-muted h-16 animate-pulse rounded-lg" />
          ))}
        </div>
        <div className="bg-muted h-40 animate-pulse rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="border-destructive/20 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm">
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
        <div className="pt-2 pb-4 text-center">
          <a
            href={data.representative.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-navy text-sm transition-colors"
          >
            View full record on GovTrack &rarr;
          </a>
        </div>
      )}
    </div>
  );
}
