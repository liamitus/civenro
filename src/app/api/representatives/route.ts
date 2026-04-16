import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRepresentativesByAddress } from "@/lib/civic-api";
import {
  summarizeChamberPassage,
  type ChamberPassage,
} from "@/lib/passage-summary";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { address, billId } = body;

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

    // Count roll calls per chamber for this bill, split into passage
    // votes vs procedural votes. Only passage votes prove the chamber
    // recorded individual names on final disposition — a motion to
    // suspend or recommit gets a recorded vote even when the bill
    // itself passes by voice afterward.
    const rollCallsByChamberAndCategory =
      await prisma.representativeVote.groupBy({
        by: ["chamber", "category"],
        where: { billId: parseInt(billId) },
        _count: { rollCallNumber: true },
      });

    const passageCategorySet = new Set([
      "passage",
      "passage_suspension",
      "veto_override",
    ]);
    const rollCallCounts = {
      house: { passage: 0, procedural: 0 },
      senate: { passage: 0, procedural: 0 },
    };
    for (const row of rollCallsByChamberAndCategory) {
      const chamberKey = (row.chamber || "").toLowerCase() as
        | "house"
        | "senate"
        | "";
      if (chamberKey !== "house" && chamberKey !== "senate") continue;
      const bucket = passageCategorySet.has(row.category || "")
        ? "passage"
        : "procedural";
      rollCallCounts[chamberKey][bucket] += row._count.rollCallNumber;
    }

    const chamberPassage: ChamberPassage[] = summarizeChamberPassage(
      { billType: bill.billType, currentStatus: bill.currentStatus },
      rollCallCounts,
    );

    // Derived legacy chamber filter used below when matching reps
    const relevantChambers: string[] = [];
    if (chamberPassage.some((c) => c.chamber === "house"))
      relevantChambers.push("representative");
    if (chamberPassage.some((c) => c.chamber === "senate"))
      relevantChambers.push("senator");

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
          // Get all votes for this rep on this bill, plus their cosponsorship
          // status. Cosponsorship is a strong support signal — especially
          // valuable for bills that passed without a recorded roll call.
          const [allVotes, cosponsorRow] = await Promise.all([
            prisma.representativeVote.findMany({
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
                category: true,
              },
            }),
            prisma.billCosponsor.findUnique({
              where: {
                billId_representativeId: {
                  billId: parseInt(billId),
                  representativeId: dbRep.id,
                },
              },
              select: {
                sponsoredAt: true,
                isOriginal: true,
                withdrawnAt: true,
              },
            }),
          ]);

          // Pick the best vote: passage categories first, then
          // uncategorized (likely passage with missing metadata),
          // then anything else (amendments, procedural) as last resort
          const passageCategories = ["passage", "passage_suspension", "veto_override"];
          const amendmentCategories = ["amendment", "procedural", "cloture", "nomination"];

          const passageVotes = allVotes.filter(
            (v) => v.category && passageCategories.includes(v.category)
          );
          const uncategorizedVotes = allVotes.filter((v) => !v.category);
          const otherVotes = allVotes.filter(
            (v) => v.category && !passageCategories.includes(v.category) && !amendmentCategories.includes(v.category)
          );
          const amendmentVotes = allVotes.filter(
            (v) => v.category && amendmentCategories.includes(v.category)
          );

          // Prioritized: passage > uncategorized > other > amendment
          const votes = passageVotes.length > 0
            ? passageVotes
            : uncategorizedVotes.length > 0
              ? uncategorizedVotes
              : otherVotes.length > 0
                ? otherVotes
                : amendmentVotes;

          const latestVote = votes[0];

          return {
            bioguideId: dbRep.bioguideId,
            slug: dbRep.slug,
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
            voteCategory: latestVote?.category || null,
            voteDate: latestVote?.votedAt?.toISOString() || null,
            voteHistory: allVotes.length > 1
              ? allVotes.map((v: any) => ({
                  vote: v.vote,
                  rollCallNumber: v.rollCallNumber,
                  chamber: v.chamber,
                  votedAt: v.votedAt?.toISOString() || null,
                }))
              : null,
            cosponsorship: cosponsorRow
              ? {
                  sponsoredAt: cosponsorRow.sponsoredAt?.toISOString() || null,
                  isOriginal: cosponsorRow.isOriginal,
                  withdrawnAt: cosponsorRow.withdrawnAt?.toISOString() || null,
                }
              : null,
          };
        }

        return {
          name: official.name,
          bioguideId: official.bioguideId || "",
          slug: null,
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
          voteCategory: null,
          voteDate: null,
          voteHistory: null,
          cosponsorship: null,
        };
      })
    );
    /* eslint-enable @typescript-eslint/no-explicit-any */

    const filteredReps = repsWithVotes.filter((rep) =>
      relevantChambers.includes(rep.chamber)
    );

    return NextResponse.json({
      representatives: filteredReps,
      chamberPassage,
    });
  } catch (error) {
    console.error("Error fetching representatives:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
