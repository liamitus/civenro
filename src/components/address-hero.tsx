"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAddress } from "@/hooks/use-address";
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
    <div className="relative flex h-[calc(100dvh-3.5rem)] flex-col items-center justify-center px-4 civic-pattern overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex items-center gap-3 text-civic-gold/20">
        <div className="h-px w-16 bg-civic-gold/20" />
        <span className="text-lg">&#9733;</span>
        <div className="h-px w-16 bg-civic-gold/20" />
      </div>

      <div className="w-full max-w-lg space-y-10 text-center">
        <div className="space-y-4">
          <p className="text-xs font-semibold tracking-[0.3em] uppercase text-navy/70">
            Civic Engagement Platform
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-navy leading-[1.1]">
            See what your
            <br />
            <span className="relative">
              representatives
              <svg className="absolute -bottom-1 left-0 w-full" height="6" viewBox="0 0 300 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 3C50 1 100 5 150 3C200 1 250 5 300 3" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
              </svg>
            </span>
            <br />
            are doing
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
            Track legislation, see how your elected officials vote, and make your voice count.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your US street address"
              className="w-full h-14 px-5 pr-24 rounded-lg border-2 border-navy/10 bg-white text-base placeholder:text-muted-foreground focus:outline-none focus:border-navy/30 focus:ring-4 focus:ring-navy/5 transition-all"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-5 bg-navy text-white text-sm font-medium rounded-md hover:bg-navy-light transition-colors tracking-wide"
            >
              Go
            </button>
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">
            We don&apos;t store your address. It stays on your device.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
              Privacy policy
            </Link>
          </p>
        </form>

        <div className="pt-2">
          <Link
            href="/bills"
            className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-navy tracking-wide uppercase transition-colors"
          >
            <div className="h-px w-6 bg-current" />
            Browse all bills
            <div className="h-px w-6 bg-current" />
          </Link>
        </div>
      </div>

      {/* Bottom decorative rule */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 text-civic-gold/15">
        <div className="h-px w-10 bg-civic-gold/15" />
        <span className="text-[10px] tracking-[0.2em] uppercase text-civic-gold/25 font-medium">E Pluribus Unum</span>
        <div className="h-px w-10 bg-civic-gold/15" />
      </div>
    </div>
  );
}
