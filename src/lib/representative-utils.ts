// Shared utilities for representative display

export function partyColor(party: string) {
  const p = party.toLowerCase();
  if (p.includes("democrat")) return { bar: "party-bar-democrat", badge: "bg-dem text-white", dot: "bg-dem" };
  if (p.includes("republican")) return { bar: "party-bar-republican", badge: "bg-rep text-white", dot: "bg-rep" };
  if (p.includes("independent")) return { bar: "party-bar-independent", badge: "bg-ind text-white", dot: "bg-ind" };
  if (p.includes("libertarian")) return { bar: "party-bar-libertarian", badge: "bg-lib/15 text-lib", dot: "bg-lib" };
  if (p.includes("green")) return { bar: "party-bar-green", badge: "bg-green text-white", dot: "bg-green" };
  return { bar: "party-bar-unknown", badge: "bg-gray-400 text-white", dot: "bg-gray-400" };
}

export function chamberLabel(chamber: string) {
  if (chamber === "senator") return "U.S. Senator";
  if (chamber === "representative") return "U.S. Representative";
  return chamber;
}

export function nextElection(chamber: string): string {
  const now = new Date();
  const year = now.getFullYear();

  // House: every even year. Senate: approximate next even year + 4 (staggered).
  let electionYear: number;
  if (chamber === "representative") {
    electionYear = year % 2 === 0 ? year : year + 1;
  } else {
    const next = year % 2 === 0 ? year : year + 1;
    electionYear = next + 4;
  }

  // Election day is first Tuesday after first Monday in November
  const electionDate = getElectionDay(electionYear);
  return timeUntil(now, electionDate);
}

function getElectionDay(year: number): Date {
  // First Monday in November
  const nov1 = new Date(year, 10, 1);
  const dayOfWeek = nov1.getDay();
  const firstMonday = dayOfWeek <= 1 ? 1 + (1 - dayOfWeek) : 1 + (8 - dayOfWeek);
  // First Tuesday after first Monday
  return new Date(year, 10, firstMonday + 1);
}

function timeUntil(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime();

  if (diffMs < 0) return "Election passed";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return "Election day";
  if (days === 1) return "Tomorrow";
  if (days < 14) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  if (days < 60) return "about a month";

  const months = Math.round(days / 30.44);
  if (months < 12) return `${months} months`;
  if (months < 18) return "about a year";

  const years = Math.round(days / 365.25);
  return `about ${years} years`;
}
