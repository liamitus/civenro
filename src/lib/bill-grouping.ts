import type { BillSummary } from "@/types";
import { getBillTypeInfo } from "./bill-helpers";

// Format "S.J.Res. 60" from billType="senate_joint_resolution" and
// billId="senate_joint_resolution-60-119". Falls back to billId if parsing fails.
export function formatBillNumber(billType: string, billId: string): string {
  const { shortLabel } = getBillTypeInfo(billType);
  const parts = billId.split("-");
  if (parts.length < 3) return billId;
  const number = parts[parts.length - 2];
  return `${shortLabel} ${number}`;
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, " ").trim();
}

function groupKey(bill: BillSummary): string | null {
  if (!bill.title || !bill.introducedDate || !bill.billType) return null;
  // Day-precision — ISO strings from the API start with YYYY-MM-DD.
  const day = bill.introducedDate.slice(0, 10);
  // Include billType so House/Senate companion bills with identical titles
  // don't merge — that's a separate, harder problem (different sponsors,
  // different rep-vote wiring). Sponsor is *not* part of the key: prod data
  // sometimes has sponsor = null, and sponsor-match isn't necessary for
  // confident clustering when title + chamber + day all match.
  return `${bill.billType}|${day}|${normalizeTitle(bill.title)}`;
}

export type BillFeedItem =
  | { kind: "single"; bill: BillSummary }
  | { kind: "group"; key: string; bills: BillSummary[] };

// Cluster bills that share sponsor + introduced date + normalized title.
// A group appears at the position of its first member; singletons pass
// through unchanged. Bills missing any grouping key always pass through.
export function groupBills(bills: BillSummary[]): BillFeedItem[] {
  const keyToIndex = new Map<string, number>();
  const result: BillFeedItem[] = [];

  for (const bill of bills) {
    const key = groupKey(bill);
    if (key === null) {
      result.push({ kind: "single", bill });
      continue;
    }
    const idx = keyToIndex.get(key);
    if (idx === undefined) {
      result.push({ kind: "single", bill });
      keyToIndex.set(key, result.length - 1);
    } else {
      const existing = result[idx];
      if (existing.kind === "group") {
        existing.bills.push(bill);
      } else {
        result[idx] = { kind: "group", key, bills: [existing.bill, bill] };
      }
    }
  }
  return result;
}
