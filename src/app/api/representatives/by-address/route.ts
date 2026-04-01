import { NextRequest, NextResponse } from "next/server";
import { getRepresentativesByAddress } from "@/lib/civic-api";

export async function POST(request: NextRequest) {
  const { address } = await request.json();

  if (!address) {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }

  try {
    const data = await getRepresentativesByAddress(address);
    return NextResponse.json({
      representatives: data.officials,
      state: data.state,
      district: data.district,
    });
  } catch (error) {
    console.error("Error fetching representatives by address:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to look up representatives" },
      { status: 500 }
    );
  }
}
