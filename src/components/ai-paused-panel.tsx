import Link from "next/link";

/**
 * Rendered in place of AI features when the budget is exhausted.
 * Compact enough to drop into the chat panel, bill summary area, etc.
 */
export function AiPausedPanel({
  incomeCents,
  spendCents,
  className = "",
}: {
  incomeCents?: number;
  spendCents?: number;
  className?: string;
}) {
  const hasNumbers =
    typeof incomeCents === "number" && typeof spendCents === "number";

  return (
    <div
      className={`rounded-lg border border-red-200 bg-red-50 p-4 space-y-3 text-center ${className}`}
    >
      <p className="text-sm font-medium text-red-800">
        AI features are paused this month
      </p>
      <p className="text-xs text-red-700/80">
        Govroll&apos;s AI summaries and chat are funded entirely by citizens.
        {hasNumbers && (
          <>
            {" "}
            This month: ${(incomeCents / 100).toFixed(0)} raised / $
            {(spendCents / 100).toFixed(0)} spent.
          </>
        )}{" "}
        When enough people chip in, they come back online for everyone.
      </p>
      <Link
        href="/support"
        className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-md text-xs font-semibold tracking-wide hover:bg-navy-light transition-colors"
      >
        Help bring them back
      </Link>
    </div>
  );
}
