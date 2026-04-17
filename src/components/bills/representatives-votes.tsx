"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAddress } from "@/hooks/use-address";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type {
  RepresentativeWithVote,
  ChamberPassageInfo,
  ChamberName,
} from "@/types";
import { partyColor as partyColors } from "@/lib/representative-utils";

const NO_VOTE_SENTINEL = "No vote recorded";

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

function repChamberKey(rep: RepresentativeWithVote): ChamberName | null {
  if (rep.chamber === "representative") return "house";
  if (rep.chamber === "senator") return "senate";
  return null;
}

function formatMonthDay(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function cosponsorLabel(
  cosponsorship: RepresentativeWithVote["cosponsorship"],
): string | null {
  if (!cosponsorship) return null;
  if (cosponsorship.withdrawnAt) {
    return `Withdrew as cosponsor · ${formatMonthDay(cosponsorship.withdrawnAt)}`;
  }
  const date = formatMonthDay(cosponsorship.sponsoredAt);
  if (cosponsorship.isOriginal) {
    return date ? `Original cosponsor · ${date}` : "Original cosponsor";
  }
  return date ? `Cosponsored · ${date}` : "Cosponsored";
}

/**
 * When the best vote we have for a rep is NOT a passage vote, label it
 * with context so a "Yes" badge on a procedural motion isn't mistaken
 * for a "Yes" on the bill itself. GovTrack only gives us a coarse
 * category (no motion text), so we avoid overclaiming — e.g. we don't
 * say "to advance this bill" for a procedural vote because it could
 * just as well be a motion to table.
 */
function voteContextLabel(category: string | null): string | null {
  if (!category) return null;
  switch (category) {
    case "passage":
    case "passage_suspension":
    case "veto_override":
      return null; // normal passage vote, no extra context
    case "cloture":
      return "to end debate (cloture)";
    case "amendment":
      return "on an amendment";
    case "nomination":
      return "on a related nomination";
    case "procedural":
      return "on a procedural step";
    default:
      return null;
  }
}

function RepCard({
  rep,
  displayVote,
  muted = false,
}: {
  rep: RepresentativeWithVote;
  displayVote: string;
  muted?: boolean;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const hasHistory = rep.voteHistory && rep.voteHistory.length > 1;
  const cosponsorText = cosponsorLabel(rep.cosponsorship);
  const voteContext =
    rep.vote !== NO_VOTE_SENTINEL ? voteContextLabel(rep.voteCategory) : null;

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
            {cosponsorText && (
              <p className="text-[11px] text-civic-gold mt-0.5 truncate">
                {cosponsorText}
              </p>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end gap-0.5 min-w-0">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${muted ? "text-muted-foreground" : voteColor(displayVote)}`}
            >
              {normalizeVote(displayVote)}
            </span>
            {voteContext && (
              <span className="text-[10px] text-muted-foreground italic text-right leading-tight">
                {voteContext}
              </span>
            )}
          </div>
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

function ChamberNotice({ passage }: { passage: ChamberPassageInfo }) {
  const chamberName = passage.chamber === "house" ? "House" : "Senate";

  if (passage.status === "pending") {
    // Pending + procedural votes recorded → reps have taken a
    // position on *something* related to this bill (discharge,
    // motion to proceed, cloture, etc.) even though final passage
    // hasn't happened. Surface that so the notice doesn't read as
    // "no information at all."
    if (passage.proceduralRollCallCount > 0) {
      return (
        <div className="rounded-lg border bg-accent/20 px-3 py-2.5 text-xs leading-relaxed">
          <p className="text-foreground">
            <span className="font-semibold">
              {`The ${chamberName} hasn\u2019t held a final vote on this bill yet.`}
            </span>{" "}
            <span className="text-muted-foreground">
              But it did record a vote on a related procedural step —
              typically a motion to bring the bill up for debate, end a
              filibuster, or set it aside. Those votes appear below and
              often signal where a member stands.{" "}
              <Link
                href="/about/how-congress-votes#procedural"
                className="underline underline-offset-2 hover:text-foreground"
              >
                Learn more
              </Link>
              .
            </span>
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {`The ${chamberName} hasn\u2019t voted on this bill yet.`}
      </div>
    );
  }

  if (passage.status === "passed_without_rollcall") {
    const hasProcedural = passage.proceduralRollCallCount > 0;
    return (
      <div className="rounded-lg border bg-accent/20 px-3 py-2.5 text-xs leading-relaxed">
        <p className="text-foreground">
          <span className="font-semibold">
            The {chamberName} passed this bill without a recorded roll call.
          </span>{" "}
          <span className="text-muted-foreground">
            Bills often pass by voice vote or unanimous consent when they
            aren&apos;t controversial — no individual votes are recorded
            on passage itself.
            {hasProcedural
              ? " Procedural votes during consideration were recorded — those are shown below."
              : ""}{" "}
            <Link
              href="/about/how-congress-votes"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Learn more
            </Link>
            .
          </span>
        </p>
      </div>
    );
  }

  return null;
}

export function RepresentativesVotes({ billId }: { billId: number }) {
  const { address, setUserAddress } = useAddress();
  const [reps, setReps] = useState<RepresentativeWithVote[]>([]);
  const [chamberPassage, setChamberPassage] = useState<ChamberPassageInfo[]>([]);
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
        setChamberPassage(data.chamberPassage || []);
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

  const passageByChamber = new Map(
    chamberPassage.map((p) => [p.chamber, p] as const),
  );

  const houseReps = reps.filter((r) => repChamberKey(r) === "house");
  const senateReps = reps.filter((r) => repChamberKey(r) === "senate");

  const renderChamberGroup = (
    chamber: ChamberName,
    groupReps: RepresentativeWithVote[],
  ) => {
    const passage = passageByChamber.get(chamber);
    if (!passage) return null;

    // When the chamber passed without a recorded passage roll call, the
    // chamber notice replaces the vote column. We still surface per-rep
    // cards when there's a signal worth showing: the rep cosponsored the
    // bill, or the rep has a procedural vote (motion to suspend, motion
    // to recommit, cloture) on this bill. Both are accountability data
    // even when final passage wasn't recorded.
    if (passage.status === "passed_without_rollcall") {
      const repsWithSignal = groupReps.filter(
        (r) => r.cosponsorship || r.vote !== NO_VOTE_SENTINEL,
      );
      return (
        <div className="space-y-2">
          <ChamberNotice passage={passage} />
          {repsWithSignal.map((rep) => {
            const hasVote = rep.vote !== NO_VOTE_SENTINEL;
            return (
              <RepCard
                key={rep.bioguideId}
                rep={rep}
                displayVote={hasVote ? rep.vote : "No recorded vote"}
                muted={!hasVote}
              />
            );
          })}
        </div>
      );
    }

    // When the chamber is pending and we have no votes at all, show just
    // the notice — the reps' "No vote recorded" would be misleading.
    const allMissing = groupReps.every((r) => r.vote === NO_VOTE_SENTINEL);
    if (passage.status === "pending" && allMissing) {
      return (
        <div className="space-y-2">
          <ChamberNotice passage={passage} />
          {groupReps.map((rep) => (
            <RepCard
              key={rep.bioguideId}
              rep={rep}
              displayVote="Pending"
              muted
            />
          ))}
        </div>
      );
    }

    // Pending chamber with some procedural votes recorded. Show the
    // notice (which explains what procedural votes signal) alongside
    // the rep cards. Reps without a procedural vote show "Not yet" so
    // we don't imply absence from a vote that never happened.
    if (passage.status === "pending") {
      return (
        <div className="space-y-2">
          <ChamberNotice passage={passage} />
          {groupReps.map((rep) => {
            const isMissing = rep.vote === NO_VOTE_SENTINEL;
            const displayVote = isMissing ? "Not yet" : rep.vote;
            return (
              <RepCard
                key={rep.bioguideId}
                rep={rep}
                displayVote={displayVote}
                muted={isMissing}
              />
            );
          })}
        </div>
      );
    }

    // Chamber has roll-call votes. Show each rep; a rep without a vote
    // row on a chamber that DID hold a roll call was genuinely absent.
    return (
      <div className="space-y-2">
        {groupReps.map((rep) => {
          const isMissing = rep.vote === NO_VOTE_SENTINEL;
          const displayVote = isMissing ? "Did not vote" : rep.vote;
          return (
            <RepCard
              key={rep.bioguideId}
              rep={rep}
              displayVote={displayVote}
              muted={isMissing}
            />
          );
        })}
      </div>
    );
  };

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
        <div className="space-y-3">
          {houseReps.length > 0 && renderChamberGroup("house", houseReps)}
          {senateReps.length > 0 && renderChamberGroup("senate", senateReps)}
        </div>
      )}
    </div>
  );
}
