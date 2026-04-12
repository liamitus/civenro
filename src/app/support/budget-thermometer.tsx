"use client";

/**
 * Budget thermometer — shows how much of the monthly AI budget has been
 * covered by reader contributions. When AI is paused, this section becomes
 * the dominant visual to drive conversion.
 */

export function BudgetThermometer({
  incomeCents,
  spendCents,
  aiEnabled,
  period,
}: {
  incomeCents: number;
  spendCents: number;
  aiEnabled: boolean;
  period: string;
}) {
  const incomeDollars = (incomeCents / 100).toFixed(0);
  const spendDollars = (spendCents / 100).toFixed(0);
  const target = Math.max(spendCents, 1); // avoid division by zero
  const pct = Math.min(Math.round((incomeCents / target) * 100), 100);

  // Format period: "2026-04" → "April 2026"
  const [year, month] = period.split("-");
  const monthName = new Date(Number(year), Number(month) - 1).toLocaleString(
    "en-US",
    { month: "long" }
  );

  return (
    <div
      className={`rounded-lg border p-5 space-y-3 ${
        aiEnabled
          ? "bg-card"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {monthName} {year} AI Budget
        </span>
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            aiEnabled
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {aiEnabled ? "AI Active" : "AI Paused"}
        </span>
      </div>

      {/* Bar */}
      <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            aiEnabled ? "bg-navy" : "bg-red-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex justify-between text-xs text-muted-foreground">
        <span>${incomeDollars} raised</span>
        <span>${spendDollars} AI costs</span>
      </div>

      {!aiEnabled && (
        <p className="text-sm text-red-700 font-medium">
          Govroll&apos;s AI features are paused this month because costs have
          exceeded reader support. Your contribution brings them back online.
        </p>
      )}
    </div>
  );
}
