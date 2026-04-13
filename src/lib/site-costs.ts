/**
 * Fixed monthly costs to run Govroll.
 *
 * These are real line items — update them when bills change.
 * This file is intentionally simple so anyone can read the source
 * and verify the numbers: /src/lib/site-costs.ts
 *
 * AI costs (variable) are tracked separately in the budget ledger.
 */

export type CostLineItem = {
  name: string;
  monthlyCents: number;
  note: string;
};

export const FIXED_MONTHLY_COSTS: CostLineItem[] = [
  {
    name: "Hosting (Vercel)",
    monthlyCents: 0,
    note: "Free tier for now — scales with traffic",
  },
  {
    name: "Database (Supabase)",
    monthlyCents: 0,
    note: "Free tier for now — scales with usage",
  },
  {
    name: "Domains",
    monthlyCents: 200,
    note: "govroll.com + govroll.org, amortized monthly",
  },
];

/** Buffer added on top of the AI estimate so we don't run dry mid-month. */
export const AI_BUFFER_CENTS = 500; // $5

/** Total fixed costs in cents per month. */
export const FIXED_TOTAL_CENTS = FIXED_MONTHLY_COSTS.reduce(
  (sum, item) => sum + item.monthlyCents,
  0
);

/**
 * Estimated AI cost for this month:
 *   max(last month's total, this month so far) + $5 buffer
 *
 * Adapts to real usage — grows as the site grows, never undershoots.
 */
export function estimatedAiCostCents(
  thisMonthSpendCents: number,
  lastMonthSpendCents: number
): number {
  return Math.max(thisMonthSpendCents, lastMonthSpendCents) + AI_BUFFER_CENTS;
}

/**
 * Total monthly cost = fixed infrastructure + estimated AI spend.
 * This is the real number it costs to keep Govroll online.
 */
export function totalMonthlyCostCents(
  thisMonthSpendCents: number,
  lastMonthSpendCents: number
): number {
  return (
    FIXED_TOTAL_CENTS +
    estimatedAiCostCents(thisMonthSpendCents, lastMonthSpendCents)
  );
}
