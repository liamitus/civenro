"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAddress } from "@/hooks/use-address";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { partyColor, chamberLabel, nextElection } from "@/lib/representative-utils";

interface Rep {
  name: string;
  party: string;
  bioguideId: string;
  chamber: string;
  state: string;
  district: string | null;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
}

export function RepresentativesDashboard() {
  const { address, setUserAddress, isLoaded } = useAddress();
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editAddress, setEditAddress] = useState(false);
  const [inputAddr, setInputAddr] = useState("");

  const fetchReps = useCallback(async (addr: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/representatives/by-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
      if (res.ok) {
        const data = await res.json();
        setReps(data.representatives || []);
      } else {
        setError("Could not find representatives for this address.");
      }
    } catch {
      setError("Failed to look up representatives.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoaded && address) {
      fetchReps(address);
    }
  }, [isLoaded, address, fetchReps]);

  if (!isLoaded) return null;

  if (!address) {
    return (
      <div className="rounded-lg border-2 border-dashed border-navy/10 p-8 text-center">
        <p className="text-sm text-muted-foreground mb-3">
          Enter your address to see your representatives
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (inputAddr.trim()) setUserAddress(inputAddr.trim());
          }}
          className="flex gap-2 max-w-md mx-auto"
        >
          <AddressAutocomplete
            value={inputAddr}
            onChange={setInputAddr}
            onSelect={(addr) => { setInputAddr(addr); setUserAddress(addr); }}
            placeholder="Your US street address"
            className="flex-1 h-10 px-3 rounded-md border border-input text-sm focus:outline-none focus:ring-2 focus:ring-navy/30"
          />
          <button className="h-10 px-4 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light transition-colors">
            Look up
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-navy/70">
            Your Representatives
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {editAddress ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (inputAddr.trim()) {
                  setUserAddress(inputAddr.trim());
                  setEditAddress(false);
                }
              }}
              className="flex gap-1.5"
            >
              <AddressAutocomplete
                value={inputAddr}
                onChange={setInputAddr}
                onSelect={(addr) => {
                  setInputAddr(addr);
                  setUserAddress(addr);
                  setEditAddress(false);
                }}
                placeholder={address}
                className="h-7 w-52 px-2 rounded border border-input text-xs focus:outline-none focus:ring-2 focus:ring-navy/30"
                autoFocus
              />
              <button className="h-7 px-2 bg-navy text-white text-xs rounded hover:bg-navy-light">
                Update
              </button>
              <button
                type="button"
                onClick={() => setEditAddress(false)}
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              onClick={() => { setInputAddr(""); setEditAddress(true); }}
              className="text-xs text-muted-foreground hover:text-navy transition-colors"
            >
              <span className="truncate max-w-[260px] inline-block align-bottom">{address}</span> &middot; change
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Rep Cards */}
      {!loading && !error && reps.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {reps.map((rep, i) => {
            const colors = partyColor(rep.party);
            return (
              <Link
                key={rep.bioguideId || i}
                href={`/representatives/${rep.bioguideId}`}
                className={`block relative rounded-lg bg-white border border-border/60 overflow-hidden ${colors.bar} animate-fade-slide-up hover:shadow-md transition-shadow cursor-pointer`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="p-5">
                  <div className="flex gap-4">
                    {/* Photo — served via our caching proxy */}
                    <div className="relative w-20 h-24 rounded overflow-hidden bg-muted flex-shrink-0">
                      {rep.bioguideId ? (
                        <img
                          src={`/api/photos/${rep.bioguideId}`}
                          alt={rep.name}
                          className="w-full h-full object-cover object-top select-none pointer-events-none"
                          draggable={false}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xl font-medium">
                          {rep.firstName?.[0]}{rep.lastName?.[0]}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <p className="font-semibold text-base text-navy leading-snug">
                          {rep.firstName} {rep.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {chamberLabel(rep.chamber)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${colors.badge}`}>
                          {rep.party.replace("Democratic", "Democrat").replace("Republican", "Republican")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {rep.state}{rep.district ? `-${rep.district}` : ""}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Next election in {nextElection(rep.chamber)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
