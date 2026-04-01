"use client";

import { useState, useEffect } from "react";
import { useAddress } from "@/hooks/use-address";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { RepresentativeWithVote } from "@/types";

function voteColor(vote: string) {
  if (vote === "Yea") return "text-vote-yea";
  if (vote === "Nay") return "text-vote-nay";
  if (vote === "Present") return "text-vote-present";
  if (vote === "Not Voting") return "text-vote-notvoting";
  return "text-muted-foreground";
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
      <div className="space-y-4">
        <h3 className="font-semibold text-base">Your Representatives</h3>
        <p className="text-sm text-muted-foreground">
          Enter your address to see how your representatives voted.
        </p>
        <div className="flex gap-2">
          <Input
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            placeholder="Enter your US street address"
            onKeyDown={(e) => e.key === "Enter" && handleSubmitAddress()}
          />
          <Button size="sm" onClick={handleSubmitAddress}>
            Look up
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">Your Representatives</h3>
        <button
          onClick={() => setUserAddress("")}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Change address
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : reps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No representatives found for this bill.
        </p>
      ) : (
        <div className="space-y-2">
          {reps.map((rep) => (
            <div
              key={rep.bioguideId}
              className="flex items-center gap-3 p-2 rounded-md bg-accent/30"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={rep.imageUrl || undefined} />
                <AvatarFallback>
                  {rep.firstName[0]}
                  {rep.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {rep.firstName} {rep.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {rep.party} — {rep.state}
                </p>
              </div>
              <span className={`text-sm font-semibold ${voteColor(rep.vote)}`}>
                {rep.vote}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
