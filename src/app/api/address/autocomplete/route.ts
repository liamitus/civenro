import { NextRequest, NextResponse } from "next/server";

/**
 * Proxy address autocomplete requests to Photon (Komoot).
 * Photon uses the same OpenStreetMap data as Nominatim but is
 * purpose-built for autocomplete — typically 50-150ms vs 500-2000ms.
 *
 * Free, no API key, no hard rate limit (be respectful).
 * Proxied so we can swap to a paid provider without frontend changes.
 */

interface PhotonFeature {
  properties: {
    name?: string;
    housenumber?: string;
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
    countrycode?: string;
    type?: string;
  };
}

interface PhotonResponse {
  features: PhotonFeature[];
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const params = new URLSearchParams({
      q,
      limit: "5",
      lang: "en",
      // Bias toward geographic center of US
      lat: "39.8",
      lon: "-98.5",
    });
    // Photon requires separate layer= params (URLSearchParams dedupes keys)
    const url = `https://photon.komoot.io/api/?${params}&layer=house&layer=street`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data: PhotonResponse = await res.json();

    const suggestions = data.features
      .filter((f) => f.properties.countrycode === "us")
      .map((f) => {
        const p = f.properties;
        const street = [p.housenumber, p.street || p.name]
          .filter(Boolean)
          .join(" ");
        const parts = [street, p.city, [p.state, p.postcode].filter(Boolean).join(" ")]
          .filter(Boolean);

        return { label: parts.join(", ") };
      });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Autocomplete error:", error);
    return NextResponse.json([]);
  }
}
