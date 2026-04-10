"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { StaleVoteBanner } from "./stale-vote-banner";
import { VoteHistorySection } from "./vote-history";
import type { VoteType, VoteAggregation, UserVoteStatus, RollCallVote } from "@/types";

function VoteBar({
  segments,
  total,
}: {
  segments: { label: string; count: number; color: string }[];
  total: number;
}) {
  if (total === 0) {
    return (
      <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
      {segments.map(
        (seg) =>
          seg.count > 0 && (
            <div
              key={seg.label}
              className={`h-full ${seg.color} transition-all duration-500`}
              style={{ width: `${(seg.count / total) * 100}%` }}
            />
          ),
      )}
    </div>
  );
}

function inferChamber(rollCall: RollCallVote): string {
  if (rollCall.chamber === "house") return "House";
  if (rollCall.chamber === "senate") return "Senate";
  // Infer from vote totals: Senate has 100 members, House has 435
  const total = rollCall.votes.reduce((sum, v) => sum + v.count, 0);
  return total > 200 ? "House" : "Senate";
}

function RollCallCard({ rollCall }: { rollCall: RollCallVote }) {
  const getCount = (vote: string) =>
    rollCall.votes.find((v) => v.vote === vote)?.count || 0;

  // GovTrack uses "Yea"/"Nay" for Senate, "Aye"/"No" for House
  const yea = getCount("Yea") + getCount("Aye");
  const nay = getCount("Nay") + getCount("No");

  const total = yea + nay + getCount("Present") + getCount("Not Voting");

  const result =
    yea > nay ? "Passed" : nay > yea ? "Failed" : "Tied";

  const dateStr = rollCall.votedAt
    ? new Date(rollCall.votedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">
          {inferChamber(rollCall)} Vote
        </h4>
        {dateStr && (
          <span className="text-xs text-muted-foreground">{dateStr}</span>
        )}
      </div>

      <VoteBar
        segments={[
          { label: "Yes", count: yea, color: "bg-vote-yea" },
          { label: "No", count: nay, color: "bg-vote-nay" },
          { label: "Present", count: getCount("Present"), color: "bg-vote-present" },
          { label: "Not Voting", count: getCount("Not Voting"), color: "bg-vote-notvoting" },
        ]}
        total={total}
      />

      <div className="flex flex-wrap gap-3 text-sm">
        {yea > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-yea" />
            Yes: {yea}
          </span>
        )}
        {nay > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-nay" />
            No: {nay}
          </span>
        )}
        {getCount("Present") > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-present" />
            Present: {getCount("Present")}
          </span>
        )}
        {getCount("Not Voting") > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-notvoting" />
            Not Voting: {getCount("Not Voting")}
          </span>
        )}
      </div>

      {total > 0 && (
        <p className="text-xs text-muted-foreground">
          {result} {yea}-{nay}
        </p>
      )}
    </div>
  );
}

export function VoteOnBill({ billId }: { billId: number }) {
  const { user } = useAuth();
  const [votes, setVotes] = useState<VoteAggregation | null>(null);
  const [userVote, setUserVote] = useState<VoteType | null>(null);
  const [userVoteStatus, setUserVoteStatus] = useState<UserVoteStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchVotes = useCallback(async () => {
    const res = await fetch(`/api/votes/${billId}`);
    if (res.ok) setVotes(await res.json());
  }, [billId]);

  const fetchUserVoteStatus = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/votes/${billId}/user`);
    if (res.ok) {
      const data: UserVoteStatus = await res.json();
      setUserVoteStatus(data);
      if (data.vote) setUserVote(data.vote.voteType);
    }
  }, [billId, user]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  useEffect(() => {
    fetchUserVoteStatus();
  }, [fetchUserVoteStatus]);

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
      setUserVoteStatus((prev) =>
        prev ? { ...prev, isStale: false, staleInfo: null } : null,
      );
      fetchVotes();
      fetchUserVoteStatus();
    }
    setSubmitting(false);
  };

  const getCount = (type: string) =>
    votes?.publicVotes.find((v) => v.voteType === type)?.count || 0;

  const publicTotal = getCount("For") + getCount("Against") + getCount("Abstain");

  // Show only the latest vote per chamber
  const latestRollCalls = (() => {
    if (!votes?.rollCalls?.length) return [];
    const byChamber = new Map<string, RollCallVote>();
    for (const rc of votes.rollCalls) {
      const chamber = inferChamber(rc);
      const existing = byChamber.get(chamber);
      if (!existing || (rc.votedAt && (!existing.votedAt || rc.votedAt > existing.votedAt))) {
        byChamber.set(chamber, rc);
      }
    }
    return Array.from(byChamber.values());
  })();

  const hasRollCalls = latestRollCalls.length > 0;

  // Fallback: if no rollCalls but has legacy congressionalVotes
  const hasLegacyCongressional =
    !hasRollCalls &&
    votes &&
    votes.congressionalVotes.length > 0 &&
    votes.congressionalVotes.reduce((sum, v) => sum + v.count, 0) > 0;

  return (
    <div className="space-y-4">
      {/* Stale vote banner */}
      {userVoteStatus?.isStale && userVoteStatus.staleInfo && userVote && (
        <StaleVoteBanner
          currentVote={userVote}
          votedOnVersion={userVoteStatus.staleInfo.votedOnVersion}
          currentVersion={userVoteStatus.staleInfo.currentVersion}
          changeSummary={userVoteStatus.staleInfo.changeSummary}
          onReVote={submitVote}
          onConfirm={() => submitVote(userVote)}
          submitting={submitting}
        />
      )}

      <div
        className={`grid gap-6 ${hasRollCalls || hasLegacyCongressional ? "sm:grid-cols-2" : ""}`}
      >
        {/* Public vote */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-muted-foreground">
            Public Opinion
          </h3>

          {publicTotal > 0 ? (
            <>
              <VoteBar
                segments={[
                  { label: "For", count: getCount("For"), color: "bg-vote-for" },
                  { label: "Against", count: getCount("Against"), color: "bg-vote-against" },
                  { label: "Abstain", count: getCount("Abstain"), color: "bg-vote-abstain" },
                ]}
                total={publicTotal}
              />
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-for" />
                  For: {getCount("For")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-against" />
                  Against: {getCount("Against")}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-vote-abstain" />
                  Abstain: {getCount("Abstain")}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-1">
              No votes yet — be the first to weigh in.
            </p>
          )}

          {/* Vote buttons — styled as poll CTA */}
          <div className="flex gap-2">
            {(["For", "Against", "Abstain"] as VoteType[]).map((type) => {
              const isActive = userVote === type;
              const styles = {
                For: isActive
                  ? "bg-vote-for text-white border-vote-for shadow-sm"
                  : "border-vote-for/50 text-vote-for hover:bg-vote-for-soft hover:border-vote-for",
                Against: isActive
                  ? "bg-vote-against text-white border-vote-against shadow-sm"
                  : "border-vote-against/50 text-vote-against hover:bg-vote-against-soft hover:border-vote-against",
                Abstain: isActive
                  ? "bg-vote-abstain text-white border-vote-abstain shadow-sm"
                  : "border-vote-abstain/50 text-vote-abstain hover:bg-vote-abstain-soft hover:border-vote-abstain",
              };
              return (
                <Button
                  key={type}
                  variant="outline"
                  disabled={submitting || !user}
                  onClick={() => submitVote(type)}
                  className={`flex-1 h-10 font-semibold text-sm transition-all ${styles[type]}`}
                >
                  {type}
                </Button>
              );
            })}
          </div>

          {!user && (
            <div className="rounded-lg bg-muted/50 border border-dashed px-4 py-3 text-center">
              <p className="text-sm font-medium text-foreground">
                Sign in to cast your vote
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your voice matters — let representatives know where you stand.
              </p>
            </div>
          )}

          {/* Vote history */}
          {userVoteStatus?.voteHistory && (
            <VoteHistorySection history={userVoteStatus.voteHistory} />
          )}
        </div>

        {/* Congressional votes — grouped by roll call */}
        {hasRollCalls && (
          <div className="space-y-6">
            <h3 className="text-xs font-semibold text-muted-foreground">
              Official Votes
            </h3>
            {latestRollCalls.map((rc, i) => (
              <RollCallCard key={rc.rollCallNumber ?? i} rollCall={rc} />
            ))}
          </div>
        )}

        {/* Legacy fallback for old data without roll call info */}
        {hasLegacyCongressional && (
          <div className="space-y-4">
            {(() => {
              const legacyRollCall = {
                rollCallNumber: null,
                chamber: null,
                votedAt: null,
                votes: votes!.congressionalVotes,
              } as RollCallVote;
              return (
                <>
                  <h3 className="text-xs font-semibold text-muted-foreground">
                    {inferChamber(legacyRollCall)} Vote
                  </h3>
                  <RollCallCard rollCall={legacyRollCall} />
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
