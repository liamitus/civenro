import "dotenv/config";
import { fetchGovTrackBills, delay } from "../lib/govtrack";
import { createStandalonePrisma } from "../lib/prisma-standalone";
import dayjs from "dayjs";

const prisma = createStandalonePrisma();

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function fetchBillsFunction(
  billIds?: string[],
  options?: { lookbackMonths?: number },
) {
  // How far back of lastBill.introducedDate to re-walk. Large values
  // self-heal if GovTrack indexes a bill late; small values fit inside
  // a 60s function budget. Callers running under a cron pass a small
  // value (~1); CLI/admin backfills can leave the default for safety.
  const lookbackMonths = options?.lookbackMonths ?? 6;
  try {
    if (billIds && billIds.length > 0) {
      console.log(`Fetching ${billIds.length} specific bills:`, billIds);
      for (const billId of billIds) {
        try {
          const [billType, number, congress] = billId.split("-");
          if (!billType || !number || !congress) {
            console.warn(`Invalid billId: ${billId}; skipping`);
            continue;
          }
          const bills = await fetchGovTrackBills({
            bill_type: billType,
            number,
            congress,
            limit: 1,
          });
          if (bills.length === 0) {
            console.warn(`No bill found for ${billId}`);
            continue;
          }
          await upsertBillRecord(bills[0]);
        } catch (error: any) {
          console.error(`Error fetching bill ${billId}:`, error.message);
        }
        await delay(500);
      }
    } else {
      const lastBill = await prisma.bill.findFirst({
        orderBy: { introducedDate: "desc" },
      });

      const startDate = lastBill
        ? dayjs(lastBill.introducedDate).subtract(lookbackMonths, "months")
        : dayjs("2024-01-01");
      const endDate = dayjs();
      let currentDate = startDate;

      while (currentDate.isBefore(endDate)) {
        const nextDate = currentDate.add(1, "month");
        const bills = await fetchGovTrackBills({
          introduced_date__gte: currentDate.format("YYYY-MM-DD"),
          introduced_date__lt: nextDate.format("YYYY-MM-DD"),
          limit: 1000,
          order_by: "-introduced_date",
        });

        console.log(
          `Fetched ${bills.length} bills from ${currentDate.format("YYYY-MM-DD")} to ${nextDate.format("YYYY-MM-DD")}`,
        );

        for (const bill of bills) {
          await upsertBillRecord(bill);
        }
        await delay(500);
        currentDate = nextDate;
      }
    }
    console.log("Bills fetched and stored successfully.");
  } catch (error: any) {
    console.error("Error fetching bills:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function upsertBillRecord(govTrackBill: any) {
  const billId = `${govTrackBill.bill_type}-${govTrackBill.number}-${govTrackBill.congress}`;
  try {
    await prisma.bill.upsert({
      where: { billId },
      update: {
        title: govTrackBill.title_without_number,
        date: new Date(govTrackBill.introduced_date),
        billType: govTrackBill.bill_type,
        currentChamber: govTrackBill.current_chamber,
        currentStatus: govTrackBill.current_status,
        currentStatusDate: new Date(govTrackBill.current_status_date),
        introducedDate: new Date(govTrackBill.introduced_date),
        link: govTrackBill.link,
      },
      create: {
        billId,
        title: govTrackBill.title_without_number,
        date: new Date(govTrackBill.introduced_date),
        billType: govTrackBill.bill_type,
        currentChamber: govTrackBill.current_chamber,
        currentStatus: govTrackBill.current_status,
        currentStatusDate: new Date(govTrackBill.current_status_date),
        introducedDate: new Date(govTrackBill.introduced_date),
        link: govTrackBill.link,
      },
    });
    console.log(`Upserted bill ${billId}`);
  } catch (error: any) {
    console.error(`Error upserting bill ${billId}:`, error.message);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// CLI invocation
if (require.main === module) {
  const billIds = process.argv.slice(2);
  fetchBillsFunction(billIds.length > 0 ? billIds : undefined);
}
