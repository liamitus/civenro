import "dotenv/config";
import { fetchGovTrackVoteVoters, fetchGovTrackBill, delay } from "../lib/govtrack";
import { createStandalonePrisma } from "../lib/prisma-standalone";
import dayjs from "dayjs";

const prisma = createStandalonePrisma();

interface GovTrackBillData {
  bill_type: string;
  number: number;
  congress: number;
  introduced_date: string;
  current_chamber: string | null;
  current_status: string;
  current_status_date: string;
  link: string;
  title_without_number: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchVotesFunction() {
  try {
    // Use env var for last fetched date, default to 2 years ago
    const startDate = process.env.VOTES_LAST_FETCHED
      ? dayjs(process.env.VOTES_LAST_FETCHED)
      : dayjs().subtract(2, "year");

    const endDate = dayjs();
    let currentDate = startDate;
    const billCache: Record<number, GovTrackBillData> = {};

    while (currentDate.isBefore(endDate)) {
      const nextDate = currentDate.add(1, "day");
      const voteVoters = await fetchGovTrackVoteVoters({
        created__gte: currentDate.format("YYYY-MM-DD"),
        created__lt: nextDate.format("YYYY-MM-DD"),
        limit: 1000,
        order_by: "-created",
      });

      console.log(
        `Fetched ${voteVoters.length} votes from ${currentDate.format("YYYY-MM-DD")}`
      );

      for (const voteVoter of voteVoters) {
        try {
          const person = voteVoter.person;
          const vote = voteVoter.vote;
          const bioguideId = person.bioguideid;

          if (!bioguideId) continue;

          const representative = await prisma.representative.findUnique({
            where: { bioguideId },
          });
          if (!representative) continue;

          const relatedBillId = vote.related_bill;
          if (!relatedBillId) continue;

          let billData = billCache[relatedBillId];
          if (!billData) {
            billData = (await fetchGovTrackBill(relatedBillId)) as GovTrackBillData;
            billCache[relatedBillId] = billData;
          }

          const billId = `${billData.bill_type}-${billData.number}-${billData.congress}`;

          const bill = await prisma.bill.upsert({
            where: { billId },
            update: {
              title: billData.title_without_number,
              date: new Date(billData.introduced_date),
              billType: billData.bill_type,
              currentChamber: billData.current_chamber,
              currentStatus: billData.current_status,
              currentStatusDate: new Date(billData.current_status_date),
              introducedDate: new Date(billData.introduced_date),
              link: billData.link,
            },
            create: {
              billId,
              title: billData.title_without_number,
              date: new Date(billData.introduced_date),
              billType: billData.bill_type,
              currentChamber: billData.current_chamber,
              currentStatus: billData.current_status,
              currentStatusDate: new Date(billData.current_status_date),
              introducedDate: new Date(billData.introduced_date),
              link: billData.link,
            },
          });

          const rollCallNumber = vote.number || null;
          const chamber = vote.chamber || null;
          const votedAt = vote.created ? new Date(vote.created) : null;

          await prisma.representativeVote.upsert({
            where: {
              representativeId_billId_rollCallNumber: {
                representativeId: representative.id,
                billId: bill.id,
                rollCallNumber: rollCallNumber ?? 0,
              },
            },
            update: { vote: voteVoter.option.value, chamber, votedAt },
            create: {
              representativeId: representative.id,
              billId: bill.id,
              vote: voteVoter.option.value,
              rollCallNumber,
              chamber,
              votedAt,
            },
          });
        } catch (error: any) {
          console.error("Error processing vote:", error.message);
        }
      }

      await delay(500);
      currentDate = nextDate;
    }

    console.log("Votes fetched and stored successfully.");
  } catch (error: any) {
    console.error("Error fetching votes:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

if (require.main === module) {
  fetchVotesFunction();
}
