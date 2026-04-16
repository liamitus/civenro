/**
 * Generates a SQL script that bulk-updates Representative.phone for every
 * legislator in the unitedstates/congress-legislators dataset.
 *
 * Usage: npx tsx scripts/generate-phone-sql.ts > phone-update.sql
 */

// @ts-expect-error - js-yaml types optional
import { load as parseYaml } from "js-yaml";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const LEGISLATORS_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml";

interface Legislator {
  id: { bioguide: string };
  terms: { phone?: string }[];
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

async function main() {
  process.stderr.write("Fetching legislators-current.yaml …\n");
  const res = await fetch(LEGISLATORS_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

  const text = await res.text();
  const legislators = parseYaml(text) as Legislator[];
  process.stderr.write(`Fetched ${legislators.length} legislators.\n`);

  const rows: { bioguideId: string; phone: string }[] = [];
  for (const leg of legislators) {
    const bioguideId = leg.id.bioguide;
    const phone = leg.terms[leg.terms.length - 1]?.phone ?? null;
    if (!bioguideId || !phone) continue;
    rows.push({ bioguideId, phone });
  }
  process.stderr.write(`Emitting ${rows.length} phone rows.\n`);

  const lines: string[] = [];
  lines.push("-- Bulk update Representative.phone from congress-legislators.");
  lines.push("-- Safe to re-run. Updates by bioguideId.");
  lines.push("");
  lines.push('ALTER TABLE "Representative" ADD COLUMN IF NOT EXISTS "phone" TEXT;');
  lines.push("");
  lines.push("WITH phone_data (bioguide_id, phone) AS (");
  lines.push("  VALUES");
  const valueLines = rows.map(
    (r, i) =>
      `    ('${escapeSqlLiteral(r.bioguideId)}', '${escapeSqlLiteral(r.phone)}')${i === rows.length - 1 ? "" : ","}`,
  );
  lines.push(...valueLines);
  lines.push(")");
  lines.push('UPDATE "Representative" r');
  lines.push("SET phone = phone_data.phone");
  lines.push("FROM phone_data");
  lines.push('WHERE r."bioguideId" = phone_data.bioguide_id;');
  lines.push("");

  const outPath = resolve(process.cwd(), "phone-update.sql");
  writeFileSync(outPath, lines.join("\n"));
  process.stderr.write(`Wrote ${outPath}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
