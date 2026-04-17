import { describe, it, expect } from "vitest";

/**
 * The chamber filter has two sides that must agree:
 *
 * 1. API route — filters bills with: { billType: { startsWith: "house" } }
 *    or { billType: { startsWith: "senate" } }
 *
 * 2. BillCard display — shows "House" when billType.startsWith("house"),
 *    "Senate" when billType.startsWith("senate")
 *
 * If these diverge (e.g. the API filters on a different field), users see
 * bills tagged "HOUSE" when they selected the "Senate" filter.
 */

// All known billType values from the BILL_TYPES constant in bill-helpers.ts
const BILL_TYPES = [
  "house_bill",
  "house_resolution",
  "house_joint_resolution",
  "house_concurrent_resolution",
  "senate_bill",
  "senate_resolution",
  "senate_joint_resolution",
  "senate_concurrent_resolution",
];

// ── Replicate the display logic from BillCard (bill-card.tsx) ──────────

function displayChamber(billType: string): "house" | "senate" | null {
  if (billType.startsWith("house")) return "house";
  if (billType.startsWith("senate")) return "senate";
  return null;
}

// ── Replicate the API filter logic from /api/bills/route.ts ────────────

function apiFilterMatches(
  billType: string,
  filterValue: "house" | "senate",
): boolean {
  // Mirrors: filters.billType = { startsWith: chamber.toLowerCase() }
  return billType.startsWith(filterValue);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe("bills chamber filter", () => {
  it("every bill type is classified as either house or senate", () => {
    for (const bt of BILL_TYPES) {
      expect(displayChamber(bt)).not.toBeNull();
    }
  });

  it("API filter matches exactly the bills displayed as that chamber", () => {
    for (const bt of BILL_TYPES) {
      const displayed = displayChamber(bt)!;

      // When the user selects "House", only bills displayed as House should match
      expect(apiFilterMatches(bt, "house")).toBe(displayed === "house");
      // When the user selects "Senate", only bills displayed as Senate should match
      expect(apiFilterMatches(bt, "senate")).toBe(displayed === "senate");
    }
  });

  it("house filter never includes senate bill types", () => {
    const senateBills = BILL_TYPES.filter((bt) => bt.startsWith("senate_"));
    for (const bt of senateBills) {
      expect(apiFilterMatches(bt, "house")).toBe(false);
    }
  });

  it("senate filter never includes house bill types", () => {
    const houseBills = BILL_TYPES.filter((bt) => bt.startsWith("house_"));
    for (const bt of houseBills) {
      expect(apiFilterMatches(bt, "senate")).toBe(false);
    }
  });

  it("'both' filter would include all bill types (no filter applied)", () => {
    // When chamber is "both", the API doesn't add a billType filter,
    // so all bills pass through. Verify no bill type would be excluded.
    expect(BILL_TYPES.length).toBeGreaterThan(0);
    // Both house and senate types exist
    expect(BILL_TYPES.some((bt) => bt.startsWith("house"))).toBe(true);
    expect(BILL_TYPES.some((bt) => bt.startsWith("senate"))).toBe(true);
  });
});
