"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAddress } from "@/hooks/use-address";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { RepresentativeWithVote } from "@/types";
import { partyColor as partyColors } from "@/lib/representative-utils";

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

function chamberLabel(chamber: string | null): string {
  if (!chamber) return "";
  if (chamber === "house") return "House";
  if (chamber === "senate") return "Senate";
  return chamber.charAt(0).toUpperCase() + chamber.slice(1);
}

function RepCard({ rep, muted = false }: { rep: RepresentativeWithVote; muted?: boolean }) {
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = rep.voteHistory && rep.voteHistory.length > 1;

  return (
    <div className={`rounded-lg bg-card border ${partyColors(rep.party).bar} ${muted ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 p-3">
        <Link
          href={`/representatives/${rep.slug || rep.bioguideId}`}
          className="flex items-center gap-3 flex-1 min-w-0 hover:opacity-80 transition-opacity"
        >
          <div className={`relative ${muted ? "w-9 h-11" : "w-11 h-14"} rounded-md overflow-hidden bg-muted flex-shrink-0`}>
            {rep.bioguideId ? (
              <img
                src={`/api/photos/${rep.bioguideId}`}
                alt={`${rep.firstName} ${rep.lastName}`}
                className="w-full h-full object-cover object-[center_20%] select-none pointer-events-none"
                draggable={false}
                loading="lazy"
                onError={(e) => {
                  const el = e.currentTarget;
                  el.style.display = "none";
                  el.parentElement!.querySelector("[data-fallback]")!.removeAttribute("hidden");
                }}
              />
            ) : null}
            <div data-fallback hidden={!!rep.bioguideId} className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-semibold">
              {rep.firstName[0]}{rep.lastName[0]}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-semibold truncate ${muted ? "text-xs" : "text-sm"}`}>
              {rep.firstName} {rep.lastName}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {rep.party.replace("Democratic", "Democrat")} · {rep.state}
              {rep.district ? `-${rep.district}` : ""}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${muted ? "text-muted-foreground" : voteColor(rep.vote)}`}
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
        <p className="text-xs text-muted-foreground">
          Your address is only used to find your district and is never saved.{" "}
          <a
            href="https://github.com/liamitus/govroll/blob/main/src/lib/civic-api.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            See how it works
          </a>
        </p>
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
          {(() => {
            const voted = reps.filter((r) => r.vote !== "No vote recorded");
            const notVoted = reps.filter((r) => r.vote === "No vote recorded");
            return (
              <>
                {voted.map((rep) => (
                  <RepCard key={rep.bioguideId} rep={rep} />
                ))}
                {notVoted.length > 0 && voted.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Not yet voted on this bill
                  </p>
                )}
                {notVoted.map((rep) => (
                  <RepCard key={rep.bioguideId} rep={rep} muted />
                ))}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
