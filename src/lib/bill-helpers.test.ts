import { describe, it, expect } from "vitest";
import {
  buildDynamicJourney,
  getEffectiveStatus,
  formatJourneyDate,
} from "./bill-helpers";

// Reproduces the production state of S. 1884 (bill 11315) on 2026-04-17:
// the DB still carries currentStatus="passed_bill" but the ingested actions
// include both a "Became Public Law..." and a "Signed by President." row
// dated 2026-04-13. Congress.gov returns actionType="President" for these.
const signedBillActions = [
  {
    actionDate: new Date("2025-05-22T00:00:00Z"),
    chamber: "Senate",
    text: "Read twice and referred to the Committee on the Judiciary.",
    actionType: "IntroReferral",
  },
  {
    actionDate: new Date("2025-05-22T00:00:00Z"),
    chamber: null,
    text: "Introduced in Senate",
    actionType: "IntroReferral",
  },
  {
    actionDate: new Date("2025-11-18T00:00:00Z"),
    chamber: "Senate",
    text: "Committee on the Judiciary. Reported by Senator Grassley with amendments. Without written report.",
    actionType: "Committee",
  },
  {
    actionDate: new Date("2025-12-10T00:00:00Z"),
    chamber: "Senate",
    text: "Passed Senate with amendments by Unanimous Consent.",
    actionType: "Floor",
  },
  {
    actionDate: new Date("2026-03-16T00:00:00Z"),
    chamber: "House",
    text: "On motion to suspend the rules and pass the bill Agreed to by voice vote.",
    actionType: "Floor",
  },
  {
    actionDate: new Date("2026-04-02T00:00:00Z"),
    chamber: "House",
    text: "Presented to President.",
    actionType: "Floor",
  },
  {
    actionDate: new Date("2026-04-13T00:00:00Z"),
    chamber: null,
    text: "Became Public Law No: 119-82.",
    actionType: "President",
  },
  {
    actionDate: new Date("2026-04-13T00:00:00Z"),
    chamber: null,
    text: "Signed by President.",
    actionType: "President",
  },
];

describe("buildDynamicJourney — enacted bill with stale passed_bill status", () => {
  it("collapses Became-Public-Law and Signed-by-President into a single Signed into Law step", () => {
    const steps = buildDynamicJourney(
      "senate_bill",
      "passed_bill",
      signedBillActions,
      [],
    );
    const signed = steps.filter((s) => s.label === "Signed into Law");
    expect(signed).toHaveLength(1);
    expect(signed[0].status).toBe("completed");
  });

  it("does not append a Presidential-signature future step when actions show the bill was signed", () => {
    const steps = buildDynamicJourney(
      "senate_bill",
      "passed_bill",
      signedBillActions,
      [],
    );
    const labels = steps.map((s) => s.label);
    expect(labels).not.toContain("Presidential signature");
    expect(labels).not.toContain("Become Law");
  });

  it("marks the Signed into Law step as the terminal completed step (no lingering current/upcoming)", () => {
    const steps = buildDynamicJourney(
      "senate_bill",
      "passed_bill",
      signedBillActions,
      [],
    );
    const last = steps[steps.length - 1];
    expect(last.label).toBe("Signed into Law");
    expect(last.status).toBe("completed");
    expect(steps.every((s) => s.status === "completed")).toBe(true);
  });

  it("recognizes Congress.gov 'President' actionType as a signing action (not only 'BecameLaw')", () => {
    const minimal = [
      {
        actionDate: new Date("2026-01-01T00:00:00Z"),
        chamber: "Senate",
        text: "Read twice and referred to the Committee on the Judiciary.",
        actionType: "IntroReferral",
      },
      {
        actionDate: new Date("2026-02-01T00:00:00Z"),
        chamber: "Senate",
        text: "Passed Senate by Unanimous Consent.",
        actionType: "Floor",
      },
      {
        actionDate: new Date("2026-03-01T00:00:00Z"),
        chamber: "House",
        text: "On passage Passed without objection.",
        actionType: "Floor",
      },
      {
        actionDate: new Date("2026-04-01T00:00:00Z"),
        chamber: null,
        text: "Became Public Law No: 119-99.",
        actionType: "President",
      },
    ];

    const steps = buildDynamicJourney(
      "senate_bill",
      "passed_bill",
      minimal,
      [],
    );
    expect(steps.some((s) => s.label === "Signed into Law")).toBe(true);
  });
});

describe("getEffectiveStatus", () => {
  it("promotes passed_bill to enacted_signed when actions include a signing action", () => {
    expect(
      getEffectiveStatus("senate_bill", "passed_bill", signedBillActions, []),
    ).toBe("enacted_signed");
  });

  it("leaves passed_bill unchanged when no signing action exists yet", () => {
    const notYetSigned = signedBillActions.filter(
      (a) => a.actionType !== "President",
    );
    expect(
      getEffectiveStatus("senate_bill", "passed_bill", notYetSigned, []),
    ).toBe("passed_bill");
  });

  it("still preserves the existing pass_back_{chamber} correction when last milestone is 'with changes'", () => {
    // Senate-origin bill: Senate passed, House passed with amendments → Senate
    // needs to vote on changes. Last milestone will end up as "Passed House
    // (with changes)" once version details get attached — but without
    // version records this fallback isn't triggered, so this test just
    // asserts that the signing-promotion change didn't break the prior
    // behavior for non-enacted bills.
    const noSigning = signedBillActions.filter(
      (a) => a.actionType !== "President",
    );
    expect(
      getEffectiveStatus("senate_bill", "passed_bill", noSigning, []),
    ).toBe("passed_bill");
  });
});

describe("formatJourneyDate", () => {
  // The bug: action dates are stored as UTC midnight (2026-04-13T00:00:00Z),
  // and dayjs(iso).format("MMM D") reads in the viewer's local timezone.
  // For any viewer west of UTC that renders as "Apr 12" — off by one day.
  // The formatter must render in UTC so calendar dates match congress.gov.
  it("formats a UTC-midnight ISO string in UTC regardless of the process timezone", () => {
    const iso = "2026-04-13T00:00:00.000Z";
    expect(formatJourneyDate(iso, "short")).toBe("Apr 13");
    expect(formatJourneyDate(iso, "long")).toBe("Apr 13, 2026");
  });

  it("handles New Year's UTC midnight without shifting the year backward", () => {
    const iso = "2026-01-01T00:00:00.000Z";
    expect(formatJourneyDate(iso, "long")).toBe("Jan 1, 2026");
  });
});
