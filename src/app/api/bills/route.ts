import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { statusMapping } from "@/lib/status-mapping";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = parseInt(searchParams.get("limit") || "20", 10);
  const chamber = searchParams.get("chamber");
  const status = searchParams.get("status");
  const sortBy = searchParams.get("sortBy") || "relevant";
  const order = searchParams.get("order") || "desc";
  const search = searchParams.get("search");

  const skip = (page - 1) * limit;

  // Build filters
  const filters: Record<string, unknown> = {};

  if (chamber && chamber !== "both") {
    filters.currentChamber = chamber.toLowerCase();
  }

  if (status && statusMapping[status]) {
    filters.currentStatus = { in: statusMapping[status] };
  }

  if (search) {
    filters.title = { contains: search, mode: "insensitive" };
  }

  // Build sort order — "relevant" uses engagement + activity signals,
  // anything else sorts by that field directly
  let orderBy: Record<string, unknown>[] | Record<string, unknown>;
  if (sortBy === "relevant") {
    orderBy = [
      { votes: { _count: "desc" } },
      { publicVotes: { _count: "desc" } },
      { comments: { _count: "desc" } },
      { currentStatusDate: "desc" },
    ];
  } else {
    orderBy = { [sortBy]: order };
  }

  try {
    const [total, bills] = await Promise.all([
      prisma.bill.count({ where: filters }),
      prisma.bill.findMany({
        where: filters,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          billId: true,
          title: true,
          date: true,
          billType: true,
          currentChamber: true,
          currentStatus: true,
          currentStatusDate: true,
          introducedDate: true,
          link: true,
          shortText: true,
        },
      }),
    ]);

    return NextResponse.json({ total, page, pageSize: limit, bills });
  } catch (error) {
    console.error("Error fetching bills:", error);
    return NextResponse.json(
      { error: "Failed to fetch bills" },
      { status: 500 }
    );
  }
}
