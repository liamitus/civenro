/**
 * Maps CRS (Congressional Research Service) policy areas to user-friendly
 * topic labels for the bills listing page.
 */

export interface TopicInfo {
  label: string;
  /** CRS policyArea values that map to this topic */
  policyAreas: string[];
  color: string;
}

export const TOPICS: TopicInfo[] = [
  {
    label: "Health",
    policyAreas: ["Health"],
    color: "bg-rose-100 text-rose-700",
  },
  {
    label: "Defense",
    policyAreas: ["Armed Forces and National Security"],
    color: "bg-slate-100 text-slate-700",
  },
  {
    label: "Education",
    policyAreas: ["Education"],
    color: "bg-violet-100 text-violet-700",
  },
  {
    label: "Economy",
    policyAreas: [
      "Economics and Public Finance",
      "Finance and Financial Sector",
    ],
    color: "bg-emerald-100 text-emerald-700",
  },
  {
    label: "Environment",
    policyAreas: [
      "Environmental Protection",
      "Public Lands and Natural Resources",
      "Water Resources Development",
    ],
    color: "bg-green-100 text-green-700",
  },
  {
    label: "Immigration",
    policyAreas: ["Immigration"],
    color: "bg-amber-100 text-amber-700",
  },
  {
    label: "Crime & Justice",
    policyAreas: ["Crime and Law Enforcement", "Law"],
    color: "bg-red-100 text-red-700",
  },
  {
    label: "Civil Rights",
    policyAreas: ["Civil Rights and Liberties, Minority Issues"],
    color: "bg-purple-100 text-purple-700",
  },
  {
    label: "Technology",
    policyAreas: ["Science, Technology, Communications"],
    color: "bg-cyan-100 text-cyan-700",
  },
  {
    label: "Foreign Affairs",
    policyAreas: [
      "International Affairs",
      "Foreign Trade and International Finance",
    ],
    color: "bg-blue-100 text-blue-700",
  },
  {
    label: "Housing",
    policyAreas: ["Housing and Community Development"],
    color: "bg-orange-100 text-orange-700",
  },
  {
    label: "Transportation",
    policyAreas: ["Transportation and Public Works"],
    color: "bg-sky-100 text-sky-700",
  },
  {
    label: "Agriculture",
    policyAreas: ["Agriculture and Food"],
    color: "bg-lime-100 text-lime-700",
  },
  {
    label: "Energy",
    policyAreas: ["Energy"],
    color: "bg-yellow-100 text-yellow-700",
  },
  {
    label: "Government",
    policyAreas: ["Government Operations and Politics", "Congress", "Taxation"],
    color: "bg-zinc-100 text-zinc-700",
  },
  {
    label: "Families",
    policyAreas: ["Families", "Social Welfare"],
    color: "bg-pink-100 text-pink-700",
  },
  {
    label: "Labor",
    policyAreas: ["Labor and Employment"],
    color: "bg-indigo-100 text-indigo-700",
  },
  {
    label: "Commerce",
    policyAreas: ["Commerce"],
    color: "bg-teal-100 text-teal-700",
  },
];

/** Reverse lookup: CRS policyArea string -> TopicInfo */
const policyAreaToTopic = new Map<string, TopicInfo>();
for (const topic of TOPICS) {
  for (const area of topic.policyAreas) {
    policyAreaToTopic.set(area, topic);
  }
}

/** Get the user-friendly topic for a CRS policyArea, or null if unmapped */
export function getTopicForPolicyArea(
  policyArea: string | null,
): TopicInfo | null {
  if (!policyArea) return null;
  return policyAreaToTopic.get(policyArea) ?? null;
}
