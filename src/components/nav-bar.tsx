"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Menu } from "lucide-react";
import { useState } from "react";
import { AuthModal } from "@/components/auth/auth-modal";

export function NavBar() {
  const { user, loading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-navy border-b border-white/10">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-civic-gold text-sm tracking-widest">&#9733;</span>
          <span className="text-white text-base font-semibold tracking-wide uppercase">
            Govroll
          </span>
          <span className="text-civic-gold text-sm tracking-widest">&#9733;</span>
        </Link>

        <div className="flex items-center gap-2">
          {!loading && !user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="text-sm text-white/80 hover:text-white border border-white/15 hover:border-white/30 hover:bg-white/10 h-8 px-4 tracking-wide uppercase"
            >
              Sign In
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center justify-center size-8 text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors cursor-pointer"
            >
              <Menu className="size-[18px]" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="min-w-[180px]">
              {user && (
                <>
                  <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground truncate max-w-[200px]">
                    {user.email}
                  </div>
                  <DropdownMenuItem render={<Link href="/account" />}>
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem render={<Link href="/bills" />}>
                Bills
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/support" />}>
                Support Govroll
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/about" />}>
                About
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/contact" />}>
                Contact
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem render={<Link href="/privacy" />}>
                Privacy Policy
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/terms" />}>
                Terms of Service
              </DropdownMenuItem>
              {user && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={signOut}
                    className="text-muted-foreground"
                  >
                    Sign Out
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </header>
  );
}
