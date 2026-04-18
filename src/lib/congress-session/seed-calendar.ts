import { PrismaClient } from "@/generated/prisma/client";
import type { Chamber } from "./types";

/**
 * 2026 non-session calendars — idempotent seed for CongressRecess.
 *
 * Scope: only *named* multi-day recess blocks (district work periods,
 * holidays, the August/Election recesses). Weekends between session weeks
 * are handled by a weekend-fallback rule in the waterfall; we don't need
 * them in the DB.
 *
 * Sources:
 *   House:  https://www.majorityleader.gov/uploadedfiles/legislative_2026_calendar_119_house.pdf
 *           cross-verified against https://rollcall.com/2025/11/18/house-2026-calendar-midterm-elections/
 *           and https://pressgallery.house.gov/schedules/2026-house-calendar
 *   Senate: https://www.senate.gov/legislative/2026_schedule.htm
 *
 * Update cadence: re-seed yearly when the new calendar is published
 * (typically Nov–Dec for the following year). Add the next year's rows
 * next to these; old rows can stay for historical queries.
 */

export interface RecessRow {
  chamber: Chamber;
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string; // YYYY-MM-DD (inclusive)
  label: string;
}

export const RECESSES_2026: RecessRow[] = [
  // ── HOUSE ─────────────────────────────────────────────────────────────
  {
    chamber: "house",
    startDate: "2026-01-01",
    endDate: "2026-01-05",
    label: "New Year's / Pre-Session",
  },
  {
    chamber: "house",
    startDate: "2026-01-16",
    endDate: "2026-01-19",
    label: "Martin Luther King Jr. Day District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-01-24",
    endDate: "2026-02-01",
    label: "January District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-02-13",
    endDate: "2026-02-22",
    label: "Presidents' Day District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-03-07",
    endDate: "2026-03-15",
    label: "Early March District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-03-21",
    endDate: "2026-04-13",
    label: "Spring / Easter-Passover District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-04-25",
    endDate: "2026-05-03",
    label: "Late April District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-05-22",
    endDate: "2026-06-01",
    label: "Memorial Day District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-06-12",
    endDate: "2026-06-22",
    label: "Juneteenth District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-07-03",
    endDate: "2026-07-12",
    label: "Independence Day District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-07-25",
    endDate: "2026-08-30",
    label: "August Recess",
  },
  {
    chamber: "house",
    startDate: "2026-09-05",
    endDate: "2026-09-13",
    label: "Labor Day District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-10-02",
    endDate: "2026-11-08",
    label: "Election Recess",
  },
  {
    chamber: "house",
    startDate: "2026-11-21",
    endDate: "2026-11-29",
    label: "Thanksgiving District Work Period",
  },
  {
    chamber: "house",
    startDate: "2026-12-18",
    endDate: "2026-12-31",
    label: "Year-End Recess",
  },

  // ── SENATE ────────────────────────────────────────────────────────────
  {
    chamber: "senate",
    startDate: "2026-01-01",
    endDate: "2026-01-02",
    label: "New Year's Day",
  },
  {
    chamber: "senate",
    startDate: "2026-01-19",
    endDate: "2026-01-23",
    label: "State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-02-16",
    endDate: "2026-02-20",
    label: "Presidents' Day State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-03-30",
    endDate: "2026-04-10",
    label: "State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-05-04",
    endDate: "2026-05-08",
    label: "State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-05-25",
    endDate: "2026-05-29",
    label: "Memorial Day State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-06-19",
    endDate: "2026-06-19",
    label: "Juneteenth",
  },
  {
    chamber: "senate",
    startDate: "2026-06-29",
    endDate: "2026-07-10",
    label: "Independence Day State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-08-10",
    endDate: "2026-09-11",
    label: "August Recess",
  },
  {
    chamber: "senate",
    startDate: "2026-10-05",
    endDate: "2026-11-06",
    label: "Election State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-11-11",
    endDate: "2026-11-13",
    label: "Veterans Day",
  },
  {
    chamber: "senate",
    startDate: "2026-11-23",
    endDate: "2026-11-27",
    label: "Thanksgiving State Work Period",
  },
  {
    chamber: "senate",
    startDate: "2026-12-21",
    endDate: "2026-12-31",
    label: "Year-End Recess",
  },
];

/**
 * Idempotent upsert — safe to call from the cron endpoint on every run.
 * Uses a deterministic id (`chamber:startDate:endDate`) so re-runs overwrite
 * rather than duplicate.
 */
export async function ensureRecessesSeeded(
  prisma: PrismaClient,
  rows: RecessRow[] = RECESSES_2026,
): Promise<{ upserted: number }> {
  let upserted = 0;
  for (const row of rows) {
    const id = `${row.chamber}:${row.startDate}:${row.endDate}`;
    await prisma.congressRecess.upsert({
      where: { id },
      create: {
        id,
        chamber: row.chamber,
        startDate: new Date(row.startDate),
        endDate: new Date(row.endDate),
        label: row.label,
      },
      update: { label: row.label },
    });
    upserted++;
  }
  return { upserted };
}
