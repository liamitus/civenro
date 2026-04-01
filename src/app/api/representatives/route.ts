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

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const reps = officials.map((official: any) => ({
      name: official.name,
      party: official.party,
      bioguideId: official.bioguideId || "",
      chamber: official.chamber || "",
    }));

    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(billId) },
    });

    if (!bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    // Determine relevant chambers based on bill type
    const relevantChambers: string[] = [];
    if (bill.billType.startsWith("house_")) relevantChambers.push("representative");
    else if (bill.billType.startsWith("senate_")) relevantChambers.push("senator");
    if (bill.currentStatus === "passed_house") relevantChambers.push("senator");
    else if (bill.currentStatus === "passed_senate") relevantChambers.push("representative");

    const repsWithVotes = await Promise.all(
      reps.map(async (rep: any) => {
        let dbRep = rep.bioguideId
          ? await prisma.representative.findUnique({
              where: { bioguideId: rep.bioguideId },
            })
          : null;

        if (!dbRep) {
          const nameParts = rep.name.split(" ");
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
          const repVote = await prisma.representativeVote.findUnique({
            where: {
              representativeId_billId: {
                representativeId: dbRep.id,
                billId: parseInt(billId),
              },
            },
          });

          return {
            ...rep,
            ...dbRep,
            vote: repVote?.vote || "No vote recorded",
          };
        }

        return {
          ...rep,
          vote: "Representative not found in database",
          imageUrl: null,
          link: null,
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
