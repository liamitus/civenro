import { NextResponse } from "next/server";

/**
 * Lightweight redirect to photos hosted in our Supabase Storage bucket.
 * Photos are uploaded once by src/scripts/upload-photos.ts.
 *
 * We redirect instead of proxy to let Supabase's CDN serve the image
 * directly — no serverless function time or bandwidth consumed.
 */

const STORAGE_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/photos/congress`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ bioguideId: string }> },
) {
  const { bioguideId } = await params;

  const safe = bioguideId.replace(/[^a-zA-Z0-9]/g, "");
  if (!safe) {
    return new NextResponse("Invalid ID", { status: 400 });
  }

  return NextResponse.redirect(`${STORAGE_BASE}/${safe}.jpg`, {
    status: 302,
    headers: {
      "Cache-Control": "public, max-age=86400",
    },
  });
}
