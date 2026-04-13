"use client";

import { FIXED_MONTHLY_COSTS, AI_FLOOR_CENTS, totalMonthlyCostCents } from "@/lib/site-costs";

/**
 * Budget thermometer — shows how much of the total monthly running costs
 * have been covered by citizen contributions.
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
  const aiCostCents = Math.max(spendCents, AI_FLOOR_CENTS);
  const totalCostCents = totalMonthlyCostCents(spendCents);
  const totalDollars = (totalCostCents / 100).toFixed(0);
  const incomeDollars = (incomeCents / 100).toFixed(0);
  const target = Math.max(totalCostCents, 1);
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
        aiEnabled ? "bg-card" : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {monthName} {year} Running Costs
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
        <span>${totalDollars} to run this month</span>
      </div>

      {/* Cost breakdown */}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer hover:text-foreground transition-colors">
          What does this cover?
        </summary>
        <ul className="mt-2 space-y-1 pl-4">
          {FIXED_MONTHLY_COSTS.map((item) => (
            <li key={item.name} className="flex justify-between">
              <span>
                {item.name}{" "}
                <span className="text-muted-foreground/60">— {item.note}</span>
              </span>
              <span className="font-mono">
                ${(item.monthlyCents / 100).toFixed(0)}
              </span>
            </li>
          ))}
          <li className="flex justify-between">
            <span>
              AI APIs{" "}
              <span className="text-muted-foreground/60">
                — summaries, chat, analysis
              </span>
            </span>
            <span className="font-mono">
              ${(aiCostCents / 100).toFixed(0)}
            </span>
          </li>
          <li className="flex justify-between border-t pt-1 font-medium text-foreground">
            <span>Total</span>
            <span className="font-mono">${totalDollars}</span>
          </li>
        </ul>
        <p className="mt-2">
          <a
            href="https://github.com/liamitus/govroll/blob/main/src/lib/site-costs.ts"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            See the source code for these numbers
          </a>
        </p>
      </details>

      {!aiEnabled && (
        <p className="text-sm text-red-700 font-medium">
          AI features are paused this month because costs have exceeded what
          citizens have chipped in. When more people contribute, they come back
          online for everyone.
        </p>
      )}
    </div>
  );
}
