"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAddress } from "@/hooks/use-address";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import { partyColor, chamberLabel, nextElection } from "@/lib/representative-utils";

/** "123 Main St, Springfield, IL 62704" → "Springfield, IL" */
function shortAddress(full: string): string {
  const parts = full.split(",").map((s) => s.trim());
  if (parts.length < 2) return full;
  const stateZip = parts[parts.length - 1]; // "IL 62704" or "IL"
  const city = parts[parts.length - 2];      // "Springfield"
  const state = stateZip.replace(/\d{5}(-\d{4})?/, "").trim();
  return state ? `${city}, ${state}` : city;
}

interface Rep {
  name: string;
  party: string;
  bioguideId: string;
  slug: string | null;
  chamber: string;
  state: string;
  district: string | null;
  firstName: string;
  lastName: string;
  imageUrl: string | null;
  phone: string | null;
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
      <div className="relative rounded-lg border border-navy/10 bg-white civic-pattern overflow-hidden">
        <div className="relative px-6 py-12 sm:py-14 text-center">
          <div className="mx-auto flex items-center justify-center gap-3 text-civic-gold/30 mb-6">
            <div className="h-px w-10 bg-civic-gold/30" />
            <span className="text-sm">&#9733;</span>
            <div className="h-px w-10 bg-civic-gold/30" />
          </div>

          <p className="text-[11px] font-semibold tracking-[0.3em] uppercase text-navy/70 mb-3">
            Your Representatives
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy leading-[1.15] max-w-md mx-auto">
            See who speaks for you in Congress
          </h2>
          <p className="mt-3 text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Enter your address to see your senators and representative.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (inputAddr.trim()) setUserAddress(inputAddr.trim());
            }}
            className="mt-7 max-w-md mx-auto"
          >
            <div className="relative">
              <AddressAutocomplete
                value={inputAddr}
                onChange={setInputAddr}
                onSelect={(addr) => { setInputAddr(addr); setUserAddress(addr); }}
                placeholder="Your US street address"
                className="w-full h-12 px-4 pr-24 rounded-md border-2 border-navy/10 bg-white text-sm placeholder:text-muted-foreground focus:outline-none focus:border-navy/30 focus:ring-4 focus:ring-navy/5 transition-all"
              />
              <button className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-4 bg-navy text-white text-xs font-medium rounded tracking-wide hover:bg-navy-light transition-colors z-10">
                Look up
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground tracking-wide">
              We don&apos;t store your address. It stays on your device.{" "}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-navy transition-colors">
                Privacy policy
              </Link>
            </p>
          </form>
        </div>
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
              <span className="inline-block align-bottom" title={address}>{shortAddress(address)}</span> &middot; change
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => fetchReps(address)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-navy bg-white border border-border/60 rounded-md hover:bg-navy/5 transition-colors"
          >
            Try again
          </button>
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
                href={`/representatives/${rep.slug || rep.bioguideId}`}
                className={`flex flex-col relative rounded-lg bg-white border border-border/60 overflow-hidden ${colors.bar} animate-fade-slide-up hover:shadow-md hover:border-navy/20 transition-all cursor-pointer`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex-1 p-4">
                  <div className="flex gap-3.5">
                    {/* 4:5 portrait — object-position: center 20% avoids ceiling/forehead extremes */}
                    <div className="relative w-16 h-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {rep.bioguideId ? (
                        <img
                          src={`/api/photos/${rep.bioguideId}`}
                          alt={rep.name}
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
                      <div data-fallback hidden={!!rep.bioguideId} className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
                        {rep.firstName?.[0]}{rep.lastName?.[0]}
                      </div>
                    </div>

                    {/* Info — name is primary, everything else is muted */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-navy leading-snug">
                        {rep.firstName} {rep.lastName}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {chamberLabel(rep.chamber)} · {rep.state}{rep.district ? `-${rep.district}` : ""}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold ${colors.badge}`}>
                          {rep.party.replace("Democratic", "Democrat")}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-1.5">
                        Next election {nextElection(rep.chamber)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Phone CTA — pinned to bottom, always aligned across cards */}
                {rep.phone && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = `tel:${rep.phone}`; }}
                    className="flex items-center gap-2 text-sm font-medium text-navy/80 hover:text-navy hover:bg-navy/5 mx-2.5 mb-2.5 px-1.5 py-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    {rep.phone}
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
