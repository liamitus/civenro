import { describe, it, expect } from "vitest";
import { computeMomentum, getCurrentCongress } from "./momentum";

const baseInputs = {
  billId: "hr1-119",
  currentStatus: "introduced",
  congressNumber: 119,
  latestActionDate: null,
  currentStatusDate: new Date("2026-04-01T00:00:00Z"),
  cosponsorCount: 0,
  cosponsorPartySplit: null,
  substantiveVersions: 0,
  engagementCount: 0,
};

const now = new Date("2026-04-15T00:00:00Z");

describe("computeMomentum", () => {
  it("freshly-introduced bill in current Congress → ACTIVE tier, alive score", () => {
    const result = computeMomentum(
      { ...baseInputs, latestActionDate: new Date("2026-04-10T00:00:00Z") },
      119,
      now,
    );
    expect(result.tier).toBe("ACTIVE");
    expect(result.deathReason).toBeNull();
    expect(result.score).toBeGreaterThan(0);
  });

  it("bill from prior Congress → DEAD with CONGRESS_ENDED", () => {
    const result = computeMomentum(
      { ...baseInputs, congressNumber: 118 },
      119,
      now,
    );
    expect(result.tier).toBe("DEAD");
    expect(result.deathReason).toBe("CONGRESS_ENDED");
    expect(result.score).toBe(0);
  });

  it("bill silent for 400 days in current Congress → DEAD with LONG_SILENCE", () => {
    const result = computeMomentum(
      {
        ...baseInputs,
        latestActionDate: new Date("2025-03-01T00:00:00Z"),
      },
      119,
      now,
    );
    expect(result.tier).toBe("DEAD");
    expect(result.deathReason).toBe("LONG_SILENCE");
  });

  it("enacted bill → ENACTED tier regardless of age; score decays from 100", () => {
    const fresh = computeMomentum(
      {
        ...baseInputs,
        currentStatus: "enacted_signed",
        latestActionDate: new Date("2026-04-14T00:00:00Z"),
      },
      119,
      now,
    );
    const old = computeMomentum(
      {
        ...baseInputs,
        currentStatus: "enacted_signed",
        latestActionDate: new Date("2026-01-01T00:00:00Z"),
      },
      119,
      now,
    );
    expect(fresh.tier).toBe("ENACTED");
    expect(old.tier).toBe("ENACTED");
    expect(fresh.score).toBeGreaterThan(old.score);
    expect(fresh.score).toBeLessThanOrEqual(100);
    expect(old.score).toBeGreaterThanOrEqual(25);
  });

  it("bill that passed one chamber → ADVANCING", () => {
    const result = computeMomentum(
      {
        ...baseInputs,
        currentStatus: "pass_over_house",
        latestActionDate: new Date("2026-04-10T00:00:00Z"),
      },
      119,
      now,
    );
    expect(result.tier).toBe("ADVANCING");
  });

  it("pocket-vetoed bill → DEAD with VETOED", () => {
    const result = computeMomentum(
      {
        ...baseInputs,
        currentStatus: "vetoed_pocket",
        latestActionDate: new Date("2026-04-10T00:00:00Z"),
      },
      119,
      now,
    );
    expect(result.tier).toBe("DEAD");
    expect(result.deathReason).toBe("VETOED");
  });

  it("bipartisan cosponsors boost score over pure partisan", () => {
    const bipartisan = computeMomentum(
      {
        ...baseInputs,
        latestActionDate: new Date("2026-04-10T00:00:00Z"),
        cosponsorCount: 10,
        cosponsorPartySplit: "5 D, 5 R",
      },
      119,
      now,
    );
    const partisan = computeMomentum(
      {
        ...baseInputs,
        latestActionDate: new Date("2026-04-10T00:00:00Z"),
        cosponsorCount: 10,
        cosponsorPartySplit: "10 D",
      },
      119,
      now,
    );
    expect(bipartisan.score).toBeGreaterThan(partisan.score);
  });
});

describe("getCurrentCongress", () => {
  it("returns 119 for April 2026", () => {
    expect(getCurrentCongress(new Date("2026-04-15T00:00:00Z"))).toBe(119);
  });

  it("returns 118 for Dec 2024", () => {
    expect(getCurrentCongress(new Date("2024-12-15T00:00:00Z"))).toBe(118);
  });

  it("rolls over to 120 at Jan 3 2027", () => {
    expect(getCurrentCongress(new Date("2027-01-03T12:00:00Z"))).toBe(120);
  });
});
