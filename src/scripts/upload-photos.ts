import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createStandalonePrisma } from "../lib/prisma-standalone";

/**
 * One-time script: downloads congress member photos from the public-domain
 * unitedstates/images repo on GitHub and uploads them to a Supabase Storage
 * public bucket ("photos").
 *
 * Usage:  npx tsx src/scripts/upload-photos.ts
 *
 * Idempotent — skips photos that already exist in the bucket.
 */

const BUCKET = "photos";
const SOURCE_URL =
  "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const prisma = createStandalonePrisma();

async function ensureBucket() {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ["image/jpeg"],
    });
    if (error) throw new Error(`Failed to create bucket: ${error.message}`);
    console.log(`Created public bucket "${BUCKET}".`);
  } else {
    console.log(`Bucket "${BUCKET}" already exists.`);
  }
}

async function main() {
  await ensureBucket();

  const reps = await prisma.representative.findMany({
    select: { bioguideId: true },
  });
  console.log(`Found ${reps.length} representatives.`);

  // Check which photos already exist
  const { data: existingFiles } = await supabase.storage
    .from(BUCKET)
    .list("congress", { limit: 1000 });
  const existing = new Set(
    (existingFiles || []).map((f) => f.name),
  );

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const rep of reps) {
    const filename = `${rep.bioguideId}.jpg`;

    if (existing.has(filename)) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch(`${SOURCE_URL}/${filename}`, {
        headers: { "User-Agent": "Civenro/1.0 (one-time photo sync)" },
      });

      if (!res.ok) {
        console.warn(`  ${rep.bioguideId}: ${res.status} from GitHub, skipping`);
        failed++;
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`congress/${filename}`, buffer, {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000, immutable",
          upsert: false,
        });

      if (error) {
        console.warn(`  ${rep.bioguideId}: upload failed — ${error.message}`);
        failed++;
      } else {
        uploaded++;
      }

      // Gentle rate limit on GitHub
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`  ${rep.bioguideId}: ${err}`);
      failed++;
    }
  }

  console.log(
    `Done. Uploaded: ${uploaded}, Skipped (already exists): ${skipped}, Failed: ${failed}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
