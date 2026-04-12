import { NextResponse } from "next/server";

// GitHub raw serves the same images without rate-limiting/403s
const SOURCE_URL = "https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275";

const PHOTO_HEADERS = {
  "Content-Type": "image/jpeg",
  "Cache-Control": "public, max-age=2592000, immutable",
} as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  const safe = bioguideId.replace(/[^a-zA-Z0-9]/g, "");
  if (!safe) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  try {
    const res = await fetch(`${SOURCE_URL}/${safe}.jpg`, {
      headers: {
        "User-Agent": "Civenro/1.0 (civic engagement platform)",
      },
    });

    if (!res.ok) {
      return new NextResponse(null, { status: 404, headers: { "Cache-Control": "no-cache" } });
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("image")) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    return new NextResponse(buffer, { headers: PHOTO_HEADERS });
  } catch (error) {
    console.error(`Failed to fetch photo for ${safe}:`, error);
    return new NextResponse(null, { status: 502 });
  }
}
