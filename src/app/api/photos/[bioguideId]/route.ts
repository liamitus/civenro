import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const CACHE_DIR = path.join(process.cwd(), ".cache", "photos");
// GitHub raw serves the same images without rate-limiting/403s
const SOURCE_URL = "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275";
// Cache for 30 days
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  // Sanitize to prevent path traversal
  const safe = bioguideId.replace(/[^a-zA-Z0-9]/g, "");
  if (!safe) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  const cachePath = path.join(CACHE_DIR, `${safe}.jpg`);

  // Check cache
  try {
    const stat = await fs.stat(cachePath);
    const age = Date.now() - stat.mtimeMs;
    if (age < MAX_AGE_MS && stat.size > 1000) {
      const buffer = await fs.readFile(cachePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=2592000, immutable",
        },
      });
    }
  } catch {
    // Not cached yet, continue to fetch
  }

  // Fetch from source
  try {
    const res = await fetch(`${SOURCE_URL}/${safe}.jpg`, {
      headers: {
        "User-Agent": "Civenro/1.0 (civic engagement platform)",
      },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-cache" } });
    }

    // Verify it's actually an image before caching
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    // Write to cache (fire and forget)
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, buffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (error) {
    console.error(`Failed to fetch photo for ${safe}:`, error);
    return new NextResponse(null, { status: 502 });
  }
}
