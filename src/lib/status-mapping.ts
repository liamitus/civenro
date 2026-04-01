// Maps simplified status labels to arrays of possible DB status values
export const statusMapping: Record<string, string[]> = {
  introduced: ["introduced"],
  passed: [
    "conference_passed_house",
    "conference_passed_senate",
    "passed_bill",
    "passed_concurrentres",
    "passed_simpleres",
  ],
  enacted: ["enacted_signed", "enacted_tendayrule", "enacted_veto_override"],
};
