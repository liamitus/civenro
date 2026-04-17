import { describe, expect, it } from "vitest";
import { shouldFilterSections, buildBillChatSystemPrompt } from "./ai";
import type { BillSection } from "./bill-sections";

function section(
  heading: string,
  content: string,
  ref = heading,
): BillSection {
  return { heading, content, sectionRef: ref };
}

describe("shouldFilterSections", () => {
  it("keeps a mid-size bill under the filter threshold", () => {
    // 90K chars — smaller than typical NDAA, bigger than a short bill.
    // Pre-fix threshold was 100K; post-fix is 400K so this must fall below.
    const sections = [section("Section 1", "x".repeat(90_000))];
    expect(shouldFilterSections(sections)).toBe(false);
  });

  it("still filters bills big enough to crowd the context window", () => {
    const sections = [section("Section 1", "x".repeat(500_000))];
    expect(shouldFilterSections(sections)).toBe(true);
  });
});

describe("buildBillChatSystemPrompt", () => {
  it("includes every section the caller passes in (no silent truncation)", () => {
    const sections = Array.from({ length: 50 }, (_, i) =>
      section(
        `Section ${i + 1}. Heading ${i + 1}`,
        `Content of section ${i + 1}.`,
      ),
    );
    const prompt = buildBillChatSystemPrompt("Test Bill", sections, null);

    // All 50 section headings must appear verbatim in the prompt — callers
    // that pass more sections than the old 15-cap must still get them all.
    for (let i = 1; i <= 50; i++) {
      expect(prompt).toContain(`Section ${i}. Heading ${i}`);
      expect(prompt).toContain(`Content of section ${i}.`);
    }
  });

  it("emits a CRS-summary-only prompt when no sections are available", () => {
    const prompt = buildBillChatSystemPrompt("Test Bill", null, {
      sponsor: "Sen. X",
      cosponsorCount: 0,
      cosponsorPartySplit: null,
      policyArea: "Taxation",
      latestActionDate: "2026-04-01",
      latestActionText: "Referred.",
      shortText: "This bill does something specific.",
    });
    expect(prompt).toContain("This bill does something specific");
    expect(prompt).toContain("Congressional Research Service summary");
  });

  it("falls back to a title-only prompt when summary and sections are both missing", () => {
    const prompt = buildBillChatSystemPrompt("Test Bill", null, null);
    expect(prompt).toContain("Full bill text is not yet available");
    expect(prompt).toContain("Test Bill");
  });
});
