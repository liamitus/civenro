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
  const electionDate = getElectionDay(nextElectionYear(chamber));
  return timeUntil(now, electionDate);
}

/** Returns the year of the next election for this chamber. */
export function nextElectionYear(chamber: string): number {
  const year = new Date().getFullYear();
  if (chamber === "representative") {
    return year % 2 === 0 ? year : year + 1;
  }
  // Senate: approximate next even year + 4 (staggered)
  const next = year % 2 === 0 ? year : year + 1;
  return next + 4;
}

function getElectionDay(year: number): Date {
  // First Monday in November
  const nov1 = new Date(year, 10, 1);
  const dayOfWeek = nov1.getDay();
  const firstMonday = dayOfWeek <= 1 ? 1 + (1 - dayOfWeek) : 1 + (8 - dayOfWeek);
  // First Tuesday after first Monday
  return new Date(year, 10, firstMonday + 1);
}

/** Returns a self-contained phrase like "in about 5 years" or "tomorrow". */
function timeUntil(from: Date, to: Date): string {
  const diffMs = to.getTime() - from.getTime();

  if (diffMs < 0) return "passed";

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 14) return `in ${days} days`;
  if (days < 30) return `in ${Math.ceil(days / 7)} weeks`;
  if (days < 60) return "in about a month";

  const months = Math.round(days / 30.44);
  if (months < 12) return `in ${months} months`;
  if (months < 18) return "in about a year";

  const years = Math.round(days / 365.25);
  return `in about ${years} years`;
}
