import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRepresentativesByAddress } from "@/lib/civic-api";

export async function POST(request: NextRequest) {
  const { address, billId } = await request.json();

  if (!address || !billId) {
    return NextResponse.json(
      { error: "Address and billId are required" },
      { status: 400 }
    );
  }

  try {
    const data = await getRepresentativesByAddress(address);
    const { officials } = data;

    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(billId) },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Determine relevant chambers based on bill type and status
    const relevantChambers: string[] = [];
    if (bill.billType.startsWith("house_")) relevantChambers.push("representative");
    else if (bill.billType.startsWith("senate_")) relevantChambers.push("senator");
    if (bill.currentStatus === "passed_house") relevantChambers.push("senator");
    else if (bill.currentStatus === "passed_senate") relevantChambers.push("representative");

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const repsWithVotes = await Promise.all(
      officials.map(async (official: any) => {
        let dbRep = official.bioguideId
          ? await prisma.representative.findUnique({
              where: { bioguideId: official.bioguideId },
            })
          : null;

        if (!dbRep) {
          const nameParts = official.name.split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ");
          dbRep = await prisma.representative.findFirst({
            where: {
              firstName: { contains: firstName, mode: "insensitive" },
              lastName: { contains: lastName, mode: "insensitive" },
            },
          });
        }

        if (dbRep) {
          // Get ALL votes for this rep on this bill (across roll calls)
          const allVotes = await prisma.representativeVote.findMany({
            where: {
              representativeId: dbRep.id,
              billId: parseInt(billId),
            },
            orderBy: { votedAt: "desc" },
            select: {
              vote: true,
              rollCallNumber: true,
              chamber: true,
              votedAt: true,
            },
          });

          const latestVote = allVotes[0];

          return {
            bioguideId: dbRep.bioguideId,
            firstName: dbRep.firstName,
            lastName: dbRep.lastName,
            state: dbRep.state,
            district: dbRep.district,
            party: dbRep.party,
            chamber: dbRep.chamber,
            imageUrl: dbRep.imageUrl,
            link: dbRep.link,
            id: dbRep.id,
            name: official.name,
            vote: latestVote?.vote || "No vote recorded",
            voteHistory: allVotes.length > 1
              ? allVotes.map((v: any) => ({
                  vote: v.vote,
                  rollCallNumber: v.rollCallNumber,
                  chamber: v.chamber,
                  votedAt: v.votedAt?.toISOString() || null,
                }))
              : null,
          };
        }

        return {
          name: official.name,
          bioguideId: official.bioguideId || "",
          firstName: official.firstName || "",
          lastName: official.lastName || "",
          state: official.state || "",
          district: official.district || null,
          party: official.party || "",
          chamber: official.chamber || "",
          imageUrl: null,
          link: null,
          id: 0,
          vote: "Representative not found in database",
          voteHistory: null,
        };
      })
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const filteredReps = repsWithVotes.filter((rep) =>
      relevantChambers.includes(rep.chamber)
    );

    return NextResponse.json({ representatives: filteredReps });
  } catch (error) {
    console.error("Error fetching representatives:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
