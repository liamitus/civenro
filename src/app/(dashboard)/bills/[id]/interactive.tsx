"use client";

import { useState } from "react";
import { VoteOnBill } from "@/components/bills/vote-on-bill";
import { RepresentativesVotes } from "@/components/bills/representatives-votes";
import { CommentsSection } from "@/components/bills/comments-section";
import { AiChatbox } from "@/components/chat/ai-chatbox";
import { AuthModal } from "@/components/auth/auth-modal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function CollapsibleCard({
  title,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-xl border bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-6 py-4 text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors rounded-xl">
          {icon}
          {title}
          <svg
            className={`ml-auto h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
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
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function BillDetailInteractive({ billId }: { billId: number }) {
  const [authOpen, setAuthOpen] = useState(false);
  const openSignUp = () => setAuthOpen(true);

  return (
    <div className="space-y-4">
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
      {/* Ask AI FIRST — help users understand the bill before engaging */}
      <section className="rounded-xl border border-civic-gold/40 bg-civic-cream/30 dark:bg-accent/20 p-6">
        <h2 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-civic-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          Ask AI About This Bill
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Get plain-language answers with direct quotes from the bill text.
        </p>
        <AiChatbox billId={billId} onSignUp={openSignUp} />
      </section>

      {/* Your Representatives */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Your Representatives
        </h2>
        <RepresentativesVotes billId={billId} />
      </section>

      {/* Votes — public opinion vs congress */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          Votes
        </h2>
        <VoteOnBill billId={billId} onSignUp={openSignUp} />
      </section>

      {/* Discussion */}
      <CollapsibleCard
        title="Discussion"
        defaultOpen
        icon={
          <svg
            className="h-4 w-4 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
            />
          </svg>
        }
      >
        <CommentsSection billId={billId} onSignUp={openSignUp} />
      </CollapsibleCard>
    </div>
  );
}
