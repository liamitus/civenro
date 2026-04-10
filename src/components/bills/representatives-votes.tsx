"use client";

import { useState, useEffect } from "react";
import { useAddress } from "@/hooks/use-address";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { RepresentativeWithVote } from "@/types";

/** Normalize congressional vote jargon to plain English */
function normalizeVote(vote: string): string {
  if (vote === "Yea" || vote === "Aye") return "Yes";
  if (vote === "Nay" || vote === "No") return "No";
  return vote;
}

function voteColor(vote: string) {
  const v = normalizeVote(vote);
  if (v === "Yes") return "text-vote-yea bg-vote-yea-soft";
  if (v === "No") return "text-vote-nay bg-vote-nay-soft";
  if (v === "Present") return "text-vote-present bg-vote-present-soft";
  if (v === "Not Voting") return "text-vote-notvoting bg-vote-notvoting-soft";
  return "text-muted-foreground bg-muted";
}

function partyBarClass(party: string) {
  const p = party.toLowerCase();
  if (p.includes("democrat")) return "party-bar-democrat";
  if (p.includes("republican")) return "party-bar-republican";
  if (p.includes("independent")) return "party-bar-independent";
  if (p.includes("libertarian")) return "party-bar-libertarian";
  if (p.includes("green")) return "party-bar-green";
  return "party-bar-unknown";
}

function partyColor(party: string) {
  const p = party.toLowerCase();
  if (p.includes("democrat")) return "text-dem";
  if (p.includes("republican")) return "text-rep";
  if (p.includes("independent")) return "text-ind";
  if (p.includes("libertarian")) return "text-lib";
  if (p.includes("green")) return "text-green";
  return "text-muted-foreground";
}

function chamberLabel(chamber: string | null): string {
  if (!chamber) return "";
  if (chamber === "house") return "House";
  if (chamber === "senate") return "Senate";
  return chamber.charAt(0).toUpperCase() + chamber.slice(1);
}

function RepCard({ rep }: { rep: RepresentativeWithVote }) {
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = rep.voteHistory && rep.voteHistory.length > 1;

  return (
    <div className={`rounded-lg bg-card border ${partyBarClass(rep.party)}`}>
      <div className="flex items-center gap-3 p-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={rep.imageUrl || undefined} />
          <AvatarFallback className="text-xs font-semibold">
            {rep.firstName[0]}
            {rep.lastName[0]}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">
            {rep.firstName} {rep.lastName}
          </p>
          <p className={`text-xs ${partyColor(rep.party)}`}>
            {rep.party} — {rep.state}
            {rep.district ? `, District ${rep.district}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${voteColor(rep.vote)}`}
          >
            {normalizeVote(rep.vote)}
          </span>
          {hasHistory && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="View vote history"
            >
              <svg
                className={`h-4 w-4 transition-transform ${showHistory ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {hasHistory && showHistory && (
        <div className="px-3 pb-3 pt-0">
          <div className="border-t pt-2 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Vote History</p>
            {rep.voteHistory!.map((vh, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground">
                  {chamberLabel(vh.chamber)}
                  {vh.votedAt
                    ? ` — ${new Date(vh.votedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}`
                    : ""}
                </span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full ${voteColor(vh.vote)}`}
                >
                  {normalizeVote(vh.vote)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function RepresentativesVotes({ billId }: { billId: number }) {
  const { address, setUserAddress } = useAddress();
  const [reps, setReps] = useState<RepresentativeWithVote[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputAddress, setInputAddress] = useState("");

  useEffect(() => {
    if (address) {
      fetchReps(address);
    }
  }, [address, billId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReps = async (addr: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/representatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr, billId }),
      });
      if (res.ok) {
        const data = await res.json();
        setReps(data.representatives);
      }
    } catch (err) {
      console.error("Error fetching representatives:", err);
    }
    setLoading(false);
  };

  const handleSubmitAddress = () => {
    if (inputAddress.trim()) {
      setUserAddress(inputAddress.trim());
    }
  };

  if (!address) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Enter your address to see how your representatives voted on this bill.
        </p>
        <div className="flex items-center rounded-lg border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1">
          <Input
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="Enter your US street address"
            onKeyDown={(e) => e.key === "Enter" && handleSubmitAddress()}
            className="border-0 shadow-none focus-visible:ring-0 flex-1"
          />
          <Button
            size="sm"
            onClick={handleSubmitAddress}
            className="m-1 shrink-0"
          >
            Look up
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setUserAddress("")}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Change address
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <svg
            className="h-4 w-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Finding your representatives...
        </div>
      ) : reps.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No representatives found for this bill.
        </p>
      ) : (
        <div className="space-y-2">
          {reps.map((rep) => (
            <RepCard key={rep.bioguideId} rep={rep} />
          ))}
        </div>
      )}
    </div>
  );
}
