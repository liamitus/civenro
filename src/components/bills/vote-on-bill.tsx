"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import type { VoteType, VoteAggregation } from "@/types";

export function VoteOnBill({ billId }: { billId: number }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<VoteAggregation | null>(null);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchVotes = useCallback(async () => {
    const res = await fetch(`/api/votes/${billId}`);
    if (res.ok) setVotes(await res.json());
  }, [billId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const submitVote = async (voteType: VoteType) => {
    if (!user) return;
    setSubmitting(true);
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId, voteType }),
    });
    if (res.ok) {
      setUserVote(voteType);
      fetchVotes();
    }
    setSubmitting(false);
  };

  const getCount = (type: string) =>
    votes?.publicVotes.find((v) => v.voteType === type)?.count || 0;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-base">Public Vote</h3>

      <div className="flex gap-2">
        {(["For", "Against", "Abstain"] as VoteType[]).map((type) => (
          <Button
            key={type}
            variant={userVote === type ? "default" : "outline"}
            disabled={submitting || !user}
            onClick={() => submitVote(type)}
            className={
              type === "For"
                ? "border-vote-for text-vote-for hover:bg-vote-for-soft data-[active=true]:bg-vote-for data-[active=true]:text-white"
                : type === "Against"
                  ? "border-vote-against text-vote-against hover:bg-vote-against-soft data-[active=true]:bg-vote-against data-[active=true]:text-white"
                  : "border-vote-abstain text-vote-abstain hover:bg-vote-abstain-soft data-[active=true]:bg-vote-abstain data-[active=true]:text-white"
            }
            data-active={userVote === type}
          >
            {type} ({getCount(type)})
          </Button>
        ))}
      </div>

      {!user && (
        <p className="text-sm text-muted-foreground">
          Sign in to cast your vote.
        </p>
      )}

      {votes && votes.congressionalVotes.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Congressional Vote
          </h4>
          <div className="flex flex-wrap gap-3">
            {votes.congressionalVotes.map((v) => {
              const colorClass =
                v.vote === "Yea" ? "text-vote-yea" :
                v.vote === "Nay" ? "text-vote-nay" :
                v.vote === "Present" ? "text-vote-present" :
                "text-vote-notvoting";
              return (
                <span key={v.vote} className={`text-sm font-medium ${colorClass}`}>
                  {v.vote}: {v.count}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
