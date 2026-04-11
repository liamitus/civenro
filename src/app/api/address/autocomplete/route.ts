import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy address autocomplete requests to Nominatim (OpenStreetMap).
 * Keeps the provider behind our own endpoint so we can swap to a paid
 * service (Radar, Geoapify, etc.) without touching the frontend.
 *
 * Nominatim usage policy: max 1 req/s, must include User-Agent.
 * The frontend debounces at 300ms per user, and we're server-side
 * so multiple concurrent users share the limit — acceptable at
 * low-to-moderate traffic. Upgrade if we outgrow it.
 */

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const params = new URLSearchParams({
      q,
      format: "json",
      countrycodes: "us",
      limit: "5",
      addressdetails: "1",
    });

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          "User-Agent": "Civenro/1.0 (https://civenro.com)",
          Accept: "application/json",
        },
        // Don't cache on the edge — results change and Nominatim prefers fresh requests
        next: { revalidate: 0 },
      },
    );

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data: NominatimResult[] = await res.json();

    const suggestions = data.map((r) => {
      const { house_number, road, city, town, village, state, postcode } =
        r.address;
      const locality = city || town || village || "";
      const parts = [
        [house_number, road].filter(Boolean).join(" "),
        locality,
        [state, postcode].filter(Boolean).join(" "),
      ].filter(Boolean);

      return {
        label: parts.join(", ") || r.display_name,
        fullAddress: r.display_name,
      };
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json([]);
  }
}
