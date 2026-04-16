import { prisma } from "./prisma";

/**
 * Look up representatives by address.
 * Uses free Census geocoding to get state + congressional district,
 * then queries our own database for representatives.
 *
 * Replaces the deprecated Google Civic Information API (shut down April 2025).
 */

interface GeocodingResult {
  state: string;
  district: string | null;
}

/**
 * Geocode an address to get state abbreviation and congressional district.
 * Uses the free US Census Bureau geocoding API.
 */
async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  try {
    const encoded = encodeURIComponent(address);
    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?address=${encoded}&benchmark=Public_AR_Current&vintage=Current_Current&layers=54&format=json`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    const data = await res.json();
    const matches = data?.result?.addressMatches;
    if (!matches || matches.length === 0) return null;

    const match = matches[0];
    const stateCode = match.addressComponents?.state || "";
    const geographies = match.geographies;

    // Get congressional district from geographies
    let district: string | null = null;
    const cdKey = Object.keys(geographies || {}).find((k) =>
      k.toLowerCase().includes("congressional")
    );
    if (cdKey && geographies[cdKey]?.[0]) {
      const cd = geographies[cdKey][0].CD || geographies[cdKey][0].BASENAME;
      if (cd && cd !== "ZZ") {
        district = String(parseInt(cd, 10));
      }
    }

    return { state: stateCode, district };
  } catch (error) {
    console.error("Geocoding failed:", error);
    return null;
  }
}

/**
 * Get representatives for an address from our database.
 */
export async function getRepresentativesByAddress(address: string) {
  const geo = await geocodeAddress(address);

  if (!geo) {
    throw new Error("Could not geocode address. Please check the address and try again.");
  }

  // Find senators for the state (always 2)
  const senators = await prisma.representative.findMany({
    where: {
      state: geo.state,
      chamber: "senator",
    },
  });

  // Find house representative for the district
  const houseReps = geo.district
    ? await prisma.representative.findMany({
        where: {
          state: geo.state,
          district: geo.district,
          chamber: "representative",
        },
      })
    : [];

  // If district lookup didn't work, get all reps for the state as fallback
  const allReps =
    houseReps.length === 0
      ? await prisma.representative.findMany({
          where: {
            state: geo.state,
            chamber: "representative",
          },
        })
      : [];

  const officials = [
    ...senators.map((s) => ({
      name: `${s.firstName} ${s.lastName}`,
      party: s.party,
      bioguideId: s.bioguideId,
      slug: s.slug,
      chamber: "senator",
      photoUrl: s.imageUrl,
      state: s.state,
      district: null,
      firstName: s.firstName,
      lastName: s.lastName,
      imageUrl: s.imageUrl,
      link: s.link,
      phone: s.phone,
      id: s.id,
    })),
    ...(houseReps.length > 0 ? houseReps : allReps.length <= 3 ? allReps : []).map((r) => ({
      name: `${r.firstName} ${r.lastName}`,
      party: r.party,
      bioguideId: r.bioguideId,
      slug: r.slug,
      chamber: "representative",
      photoUrl: r.imageUrl,
      state: r.state,
      district: r.district,
      firstName: r.firstName,
      lastName: r.lastName,
      imageUrl: r.imageUrl,
      link: r.link,
      phone: r.phone,
      id: r.id,
    })),
  ];

  return { officials, state: geo.state, district: geo.district };
}
