"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAddress } from "@/hooks/use-address";
import { AddressAutocomplete } from "@/components/address-autocomplete";
import Link from "next/link";

export function AddressHero() {
  const [inputValue, setInputValue] = useState("");
  const { address, setUserAddress, isLoaded } = useAddress();
  const router = useRouter();

  // Redirect returning users
  useEffect(() => {
    if (isLoaded && address) {
      router.push("/bills");
    }
  }, [isLoaded, address, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setUserAddress(inputValue.trim());
      router.push("/bills");
    }
  };

  return (
    <div className="civic-pattern relative flex h-[calc(100dvh-3.5rem)] flex-col items-center justify-center overflow-hidden px-4">
      {/* Decorative elements */}
      <div className="text-civic-gold/20 absolute top-16 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <div className="bg-civic-gold/20 h-px w-16" />
        <span className="text-lg">&#9733;</span>
        <div className="bg-civic-gold/20 h-px w-16" />
      </div>

      <div className="w-full max-w-lg space-y-10 text-center">
        <div className="space-y-4">
          <p className="text-navy/70 text-xs font-semibold tracking-[0.3em] uppercase">
            Civic Engagement Platform
          </p>
          <h1 className="text-navy text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl">
            See what your
            <br />
            <span className="relative">
              representatives
              <svg
                className="absolute -bottom-1 left-0 w-full"
                height="6"
                viewBox="0 0 300 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M0 3C50 1 100 5 150 3C200 1 250 5 300 3"
                  stroke="#B8860B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  opacity="0.3"
                />
              </svg>
            </span>
            <br />
            are doing
          </h1>
          <p className="text-muted-foreground mx-auto max-w-sm text-base leading-relaxed">
            Plain-language bill summaries. See how your reps actually voted.
            Call them with one tap.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <AddressAutocomplete
              value={inputValue}
              onChange={setInputValue}
              onSelect={(addr) => {
                setInputValue(addr);
                setUserAddress(addr);
                router.push("/bills");
              }}
              className="border-navy/10 placeholder:text-muted-foreground focus:border-navy/30 focus:ring-navy/5 h-14 w-full rounded-lg border-2 bg-white px-5 pr-24 text-base transition-all focus:ring-4 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="bg-navy hover:bg-navy-light absolute top-1/2 right-2 z-10 h-10 -translate-y-1/2 rounded-md px-5 text-sm font-medium tracking-wide text-white transition-colors"
            >
              Go
            </button>
          </div>
          <p className="text-muted-foreground text-xs tracking-wide">
            We don&apos;t store your address. It stays on your device.{" "}
            <Link
              href="/privacy"
              className="hover:text-muted-foreground underline underline-offset-2"
            >
              Privacy policy
            </Link>
          </p>
        </form>

        <div className="pt-2">
          <Link
            href="/bills"
            className="text-muted-foreground hover:text-navy inline-flex items-center gap-2 text-xs font-medium tracking-wide uppercase transition-colors"
          >
            <div className="h-px w-6 bg-current" />
            Browse all bills
            <div className="h-px w-6 bg-current" />
          </Link>
        </div>
      </div>

      {/* Bottom decorative rule */}
      <div className="text-civic-gold/15 absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
        <div className="bg-civic-gold/15 h-px w-10" />
        <span className="text-civic-gold/25 text-[10px] font-medium tracking-[0.2em] uppercase">
          E Pluribus Unum
        </span>
        <div className="bg-civic-gold/15 h-px w-10" />
      </div>
    </div>
  );
}
