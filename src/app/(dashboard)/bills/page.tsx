import { BillListClient } from "@/components/bills/bill-list-client";
import { RepresentativesDashboard } from "@/components/representatives-dashboard";

export const metadata = {
  title: "Bills — Govroll",
  description: "Browse current government bills, filter by chamber and status.",
};

export default function BillsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-10">
      {/* Representatives section — the hero */}
      <RepresentativesDashboard />

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Legislation
        </span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      {/* Bills feed */}
      <BillListClient />
    </div>
  );
}
