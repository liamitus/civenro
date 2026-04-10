"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy border-b border-white/10">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-civic-gold text-sm tracking-widest">&#9733;</span>
            <span className="text-white text-base font-semibold tracking-wide uppercase">
              Civenro
            </span>
            <span className="text-civic-gold text-sm tracking-widest">&#9733;</span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link
              href="/bills"
              className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 rounded transition-colors tracking-wide uppercase"
            >
              Bills
            </Link>
            <Link
              href="/support"
              className="px-3 py-1.5 text-sm font-medium text-civic-gold/90 hover:text-civic-gold hover:bg-white/5 rounded transition-colors tracking-wide uppercase"
            >
              Support
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <>
              <Link
                href="/account"
                className="px-3 py-1.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/5 rounded transition-colors tracking-wide uppercase"
              >
                Account
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-sm text-white/70 hover:text-white hover:bg-white/5 h-8 tracking-wide uppercase"
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/10 h-8 px-4 tracking-wide uppercase"
            >
              Sign In
            </Button>
          )}
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
