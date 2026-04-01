import Link from "next/link";
import dayjs from "dayjs";
import type { BillSummary } from "@/types";

function statusStyle(status: string): { label: string; className: string } {
  const s = status.toLowerCase();
  if (s.includes("enacted") || s.includes("signed"))
    return { label: "Enacted", className: "bg-enacted-soft text-enacted" };
  if (s.includes("passed") || s.includes("conference"))
    return { label: "Passed", className: "bg-passed-soft text-passed" };
  return {
    label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    className: "bg-muted text-foreground/70",
  };
}

function chamberTag(billType: string): { label: string; className: string } | null {
  if (billType.startsWith("house"))
    return { label: "House", className: "text-house" };
  if (billType.startsWith("senate"))
    return { label: "Senate", className: "text-senate" };
  return null;
}

export function BillCard({ bill }: { bill: BillSummary }) {
  const status = statusStyle(bill.currentStatus);
  const chamber = chamberTag(bill.billType);

  return (
    <Link href={`/bills/${bill.id}`} className="block group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/40 focus-visible:ring-offset-2">
      <div className="relative px-5 py-4 rounded-lg border border-border/50 bg-white hover:border-navy/25 hover:shadow-[0_2px_12px_rgba(10,31,68,0.1)] transition-all duration-200">
        {/* Chamber indicator line */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
            bill.billType.startsWith("house") ? "bg-house/70" : bill.billType.startsWith("senate") ? "bg-senate/70" : "bg-muted"
          }`}
        />

        <div className="pl-3">
          <h3 className="text-sm font-medium leading-snug text-navy line-clamp-2 group-hover:text-navy-light transition-colors">
            {bill.title}
          </h3>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {chamber && (
              <span className={`text-xs font-bold tracking-wider uppercase ${chamber.className}`}>
                {chamber.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {dayjs(bill.introducedDate).format("MMM D, YYYY")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
