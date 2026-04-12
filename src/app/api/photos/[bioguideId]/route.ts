import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Serves rep photos from Supabase Storage with lazy backfill.
 *
 * Happy path: redirects to the Supabase CDN URL (no serverless time).
 *
 * If the photo doesn't exist in storage, attempts to fetch it from
 * GitHub or bioguide.congress.gov and upload it on the fly. A cooldown
 * marker prevents retrying more than once per week per rep.
 */

const BUCKET = "photos";
const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/congress`;
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

const GITHUB_URL =
  "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275";
const BIOGUIDE_URL =
  "https://bioguide.congress.gov/bioguide/photo";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bioguideId: string }> },
) {
  const { bioguideId } = await params;

  const safe = bioguideId.replace(/[^a-zA-Z0-9]/g, "");
  if (!safe) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const photoPath = `congress/${safe}.jpg`;
  const markerPath = `congress/.attempts/${safe}`;
  const cdnUrl = `${STORAGE_BASE}/${safe}.jpg`;

  // Fast path: check if photo exists via a HEAD request to the public URL.
  // This hits Supabase's CDN, not our serverless function budget.
  const head = await fetch(cdnUrl, { method: "HEAD" });
  if (head.ok) {
    return NextResponse.redirect(cdnUrl, {
      status: 302,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  // Photo missing — check cooldown marker before attempting fetch
  const supabase = getSupabase();

  const { data: marker } = await supabase.storage
    .from(BUCKET)
    .download(markerPath);

  if (marker) {
    const lastAttempt = parseInt(await marker.text(), 10);
    if (Date.now() - lastAttempt < COOLDOWN_MS) {
      // Tried recently, don't retry — return 404 so onError fallback kicks in
      return new NextResponse(null, {
        status: 404,
        headers: { "Cache-Control": "public, max-age=86400" },
      });
    }
  }

  // Write cooldown marker (fire and forget)
  supabase.storage
    .from(BUCKET)
    .upload(markerPath, new Blob([String(Date.now())]), {
      contentType: "text/plain",
      upsert: true,
    });

  // Try to fetch from sources
  const urls = [
    `${GITHUB_URL}/${safe}.jpg`,
    `${BIOGUIDE_URL}/${safe[0]}/${safe}.jpg`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Govroll/1.0 (lazy photo fetch)" },
      });
      if (!res.ok) continue;

      const buffer = Buffer.from(await res.arrayBuffer());

      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(photoPath, buffer, {
          contentType: "image/jpeg",
          cacheControl: "public, max-age=31536000, immutable",
          upsert: false,
        });

      if (!error) {
        // Uploaded successfully — redirect to CDN
        return NextResponse.redirect(cdnUrl, {
          status: 302,
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      }
    } catch {
      // Try next source
    }
  }

  // All sources failed
  return new NextResponse(null, {
    status: 404,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
