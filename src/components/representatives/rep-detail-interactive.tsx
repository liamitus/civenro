"use client";

import { useEffect, useState } from "react";
import type { RepresentativeDetailResponse } from "@/types";
import { AlignmentScore } from "./alignment-score";
import { VoteComparisonFeed } from "./vote-comparison-feed";
import { VotingStats } from "./voting-stats";

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
        <div className="h-40 rounded-xl bg-muted animate-pulse" />
        <div className="h-24 rounded-xl bg-muted animate-pulse" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
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

  return (
    <div className="space-y-8">
      <AlignmentScore
        votingRecord={data.votingRecord}
        userVotes={data.userVotes}
        repName={`${data.representative.firstName} ${data.representative.lastName}`}
      />

      <VotingStats stats={data.stats} rep={data.representative} />

      <VoteComparisonFeed
        votingRecord={data.votingRecord}
        userVotes={data.userVotes}
      />
    </div>
  );
}
