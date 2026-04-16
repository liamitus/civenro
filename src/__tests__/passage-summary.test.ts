import { describe, it, expect } from "vitest";
import {
  summarizeChamberPassage,
  chamberIsRelevant,
} from "@/lib/passage-summary";

const zero = {
  house: { passage: 0, procedural: 0 },
  senate: { passage: 0, procedural: 0 },
};

describe("summarizeChamberPassage", () => {
  it("enacted bill with no roll calls in either chamber = voice/UC both sides", () => {
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "enacted_signed" },
      zero,
    );
    expect(out).toHaveLength(2);
    expect(out.find((c) => c.chamber === "house")?.status).toBe(
      "passed_without_rollcall",
    );
    expect(out.find((c) => c.chamber === "senate")?.status).toBe(
      "passed_without_rollcall",
    );
  });

  it("enacted bill with House passage roll call only = Senate passed by voice/UC", () => {
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "enacted_signed" },
      {
        house: { passage: 1, procedural: 0 },
        senate: { passage: 0, procedural: 0 },
      },
    );
    expect(out.find((c) => c.chamber === "house")?.status).toBe(
      "passed_with_rollcall",
    );
    expect(out.find((c) => c.chamber === "senate")?.status).toBe(
      "passed_without_rollcall",
    );
  });

  it("procedural-only roll calls do NOT classify a chamber as passed_with_rollcall", () => {
    // Motion to recommit was a recorded vote, but passage itself was voice.
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "enacted_signed" },
      {
        house: { passage: 0, procedural: 1 },
        senate: { passage: 0, procedural: 0 },
      },
    );
    const house = out.find((c) => c.chamber === "house");
    expect(house?.status).toBe("passed_without_rollcall");
    expect(house?.proceduralRollCallCount).toBe(1);
  });

  it("bill passed House only, Senate pending", () => {
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "pass_over_house" },
      {
        house: { passage: 1, procedural: 0 },
        senate: { passage: 0, procedural: 0 },
      },
    );
    expect(out.find((c) => c.chamber === "house")?.status).toBe(
      "passed_with_rollcall",
    );
    expect(out.find((c) => c.chamber === "senate")?.status).toBe("pending");
  });

  it("vetoed bill — both chambers passed", () => {
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "vetoed_pocket" },
      {
        house: { passage: 1, procedural: 0 },
        senate: { passage: 1, procedural: 0 },
      },
    );
    expect(out).toHaveLength(2);
    expect(out.every((c) => c.status === "passed_with_rollcall")).toBe(true);
  });

  it("conference-committee status still surfaces both chambers", () => {
    const out = summarizeChamberPassage(
      { billType: "senate_bill", currentStatus: "conference_sent" },
      {
        house: { passage: 0, procedural: 0 },
        senate: { passage: 1, procedural: 0 },
      },
    );
    expect(out).toHaveLength(2);
    expect(out.find((c) => c.chamber === "house")?.status).toBe(
      "passed_without_rollcall",
    );
  });

  it("introduced bill — origin chamber relevant but pending", () => {
    const out = summarizeChamberPassage(
      { billType: "house_bill", currentStatus: "introduced" },
      zero,
    );
    expect(out.find((c) => c.chamber === "house")?.status).toBe("pending");
    // Senate is not relevant yet
    expect(out.find((c) => c.chamber === "senate")).toBeUndefined();
  });

  it("Senate bill that only passed Senate — House not yet relevant", () => {
    const out = summarizeChamberPassage(
      { billType: "senate_bill", currentStatus: "reported" },
      zero,
    );
    expect(out.find((c) => c.chamber === "senate")?.status).toBe("pending");
    expect(out.find((c) => c.chamber === "house")).toBeUndefined();
  });
});

describe("chamberIsRelevant", () => {
  it("non-origin chamber becomes relevant after crossover", () => {
    expect(
      chamberIsRelevant("senate", {
        billType: "house_bill",
        currentStatus: "pass_over_house",
      }),
    ).toBe(true);
  });

  it("non-origin chamber not relevant while bill is pre-passage", () => {
    expect(
      chamberIsRelevant("senate", {
        billType: "house_bill",
        currentStatus: "introduced",
      }),
    ).toBe(false);
  });
});
