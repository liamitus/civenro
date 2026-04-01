"use client";

import { useState } from "react";
import { VoteOnBill } from "@/components/bills/vote-on-bill";
import { RepresentativesVotes } from "@/components/bills/representatives-votes";
import { CommentsSection } from "@/components/bills/comments-section";
import { AiChatbox } from "@/components/chat/ai-chatbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-4 text-base font-semibold hover:text-primary transition-colors">
        {title}
        <span className="text-muted-foreground">{open ? "−" : "+"}</span>
      </CollapsibleTrigger>
      <CollapsibleContent className="pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function BillDetailInteractive({ billId }: { billId: number }) {
  return (
    <div className="divide-y">
      <Section title="Public Vote" defaultOpen>
        <VoteOnBill billId={billId} />
      </Section>

      <Section title="Your Representatives" defaultOpen>
        <RepresentativesVotes billId={billId} />
      </Section>

      <Section title="Ask AI About This Bill">
        <AiChatbox billId={billId} />
      </Section>

      <Section title="Comments" defaultOpen>
        <CommentsSection billId={billId} />
      </Section>
    </div>
  );
}
