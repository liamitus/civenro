import { PrismaClient } from "@/generated/prisma/client";
import type { Chamber } from "./types";

/**
 * Calendar fallback: is today inside a published non-session period for this
 * chamber? Returns the matching recess row (if any) plus the next transition
 * into a recess (for the "Returns Apr 28" label on in-session days).
 *
 * Dates are stored as `@db.Date` (no time), so we compare against the calling
 * code's "today" expressed as a UTC date. Congress operates in ET, which
 * means a late-night UTC conversion could put us on the wrong day — we
 * explicitly derive the ET calendar day below.
 */

export interface CalendarWindow {
  startDate: Date;
  endDate: Date;
  label: string;
}

/** YYYY-MM-DD in US Eastern time, the reference timezone for Congress. */
function easternCalendarDay(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export async function getRecessToday(
  prisma: PrismaClient,
  chamber: Chamber,
  now: Date = new Date(),
): Promise<CalendarWindow | null> {
  const today = easternCalendarDay(now);
  const rows = await prisma.$queryRaw<
    { startDate: Date; endDate: Date; label: string }[]
  >`
    SELECT "startDate", "endDate", "label"
    FROM "CongressRecess"
    WHERE "chamber" = ${chamber}
      AND "startDate" <= ${today}::date
      AND "endDate"   >= ${today}::date
    ORDER BY "startDate" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Next upcoming recess strictly after today — used as the
 * `nextTransitionAt` when the chamber is currently in session.
 */
export async function getNextRecess(
  prisma: PrismaClient,
  chamber: Chamber,
  now: Date = new Date(),
): Promise<CalendarWindow | null> {
  const today = easternCalendarDay(now);
  const rows = await prisma.$queryRaw<
    { startDate: Date; endDate: Date; label: string }[]
  >`
    SELECT "startDate", "endDate", "label"
    FROM "CongressRecess"
    WHERE "chamber" = ${chamber}
      AND "startDate" > ${today}::date
    ORDER BY "startDate" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Last day of the current recess window (for "Returns <day>" copy).
 * We return the day AFTER endDate — Congress returns the morning after the
 * recess ends.
 */
export function recessReturnDate(window: CalendarWindow): Date {
  const d = new Date(window.endDate);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}
