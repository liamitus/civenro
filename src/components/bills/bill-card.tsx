import Link from "next/link";
import dayjs from "dayjs";
import type { BillSummary } from "@/types";
import { getTopicForPolicyArea } from "@/lib/topic-mapping";

function statusStyle(status: string): { label: string; className: string } {
  if (status.startsWith("enacted_"))
    return { label: "Enacted", className: "bg-enacted-soft text-enacted" };
  if (status === "passed_bill" || status.startsWith("conference_") ||
      status === "passed_simpleres" || status === "passed_concurrentres")
    return { label: "Passed", className: "bg-passed-soft text-passed" };
  if (status.startsWith("pass_over_") || status.startsWith("pass_back_"))
    return { label: "In Progress", className: "bg-passed-soft text-passed" };
  if (status.startsWith("fail_") || status.startsWith("vetoed_") || status.startsWith("prov_kill_"))
    return { label: "Failed", className: "bg-failed-soft text-failed" };
  if (status === "reported")
    return { label: "In Committee", className: "bg-muted text-foreground/70" };
  return { label: "Introduced", className: "bg-muted text-foreground/70" };
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
  const topic = getTopicForPolicyArea(bill.policyArea);
  const displayDate = bill.latestActionDate || bill.introducedDate;

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

          {bill.shortText && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
              {bill.shortText}
            </p>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            {chamber && (
              <span className={`text-xs font-bold tracking-wider uppercase ${chamber.className}`}>
                {chamber.label}
              </span>
            )}
            {topic && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${topic.color}`}>
                {topic.label}
              </span>
            )}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
            {bill.sponsor && (
              <span className="text-xs text-muted-foreground">
                {bill.sponsor}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {dayjs(displayDate).format("MMM D, YYYY")}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
