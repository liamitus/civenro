// Maps simplified status labels to arrays of possible DB status values
export const statusMapping: Record<string, string[]> = {
  introduced: ["introduced", "reported"],
  in_progress: [
    "pass_over_house",
    "pass_over_senate",
    "pass_back_house",
    "pass_back_senate",
  ],
  passed: [
    "conference_passed_house",
    "conference_passed_senate",
    "passed_bill",
    "passed_concurrentres",
    "passed_simpleres",
  ],
  enacted: ["enacted_signed", "enacted_tendayrule", "enacted_veto_override"],
  failed: [
    "fail_originating_house",
    "fail_originating_senate",
    "fail_second_house",
    "fail_second_senate",
    "prov_kill_cloturefailed",
    "prov_kill_suspensionfailed",
    "prov_kill_pingpongfail",
    "prov_kill_veto",
    "vetoed_pocket",
    "vetoed_override_fail_originating_house",
    "vetoed_override_fail_originating_senate",
    "vetoed_override_fail_second_house",
    "vetoed_override_fail_second_senate",
  ],
};
