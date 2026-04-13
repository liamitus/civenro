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

/**
 * Minimum expected AI spend per month. Early on, actual usage may be near
 * zero, but this floor reflects what we expect once citizens are actively
 * using summaries and chat. Keeps the thermometer honest.
 */
export const AI_FLOOR_CENTS = 3000; // $30/mo

/** Total fixed costs in cents per month. */
export const FIXED_TOTAL_CENTS = FIXED_MONTHLY_COSTS.reduce(
  (sum, item) => sum + item.monthlyCents,
  0
);

/**
 * Total monthly cost = fixed infrastructure + variable AI spend (with floor).
 * This is the real number it costs to keep Govroll online.
 */
export function totalMonthlyCostCents(aiSpendCents: number): number {
  return FIXED_TOTAL_CENTS + Math.max(aiSpendCents, AI_FLOOR_CENTS);
}
