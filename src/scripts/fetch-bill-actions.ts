import "dotenv/config";
import { fetchBillActions } from "../lib/congress-api";
import type { CongressAction } from "../lib/congress-api";
import { parseBillId } from "../lib/parse-bill-id";
import { createStandalonePrisma } from "../lib/prisma-standalone";

const prisma = createStandalonePrisma();

/**
 * Derive an accurate bill status from congress.gov actions.
 *
 * GovTrack sometimes reports `passed_bill` prematurely — for example when
 * both chambers pass a bill but with different text, requiring further
 * reconciliation. Congress.gov actions reveal the actual state.
 *
 * Returns a corrected status string, or null if GovTrack's status looks fine.
 */
function reconcileStatus(
  govtrackStatus: string,
  billType: string,
  actions: CongressAction[],
): string | null {
  // Only reconcile statuses that GovTrack might get wrong.
  // Enacted bills are authoritative — congress.gov would show the signing.
  if (govtrackStatus.startsWith("enacted_")) return null;

  // Sort actions newest-first (congress.gov usually returns them this way,
  // but let's be safe)
  const sorted = [...actions].sort(
    (a, b) => new Date(b.actionDate).getTime() - new Date(a.actionDate).getTime(),
  );

  const originIsHouse = billType.startsWith("house");
  const originChamber = originIsHouse ? "House" : "Senate";
  const otherChamber = originIsHouse ? "Senate" : "House";

  // Find key milestone actions
  const passedOrigin = sorted.find(
    (a) =>
      a.chamber === originChamber &&
      /passed|agreed/i.test(a.text) &&
      a.type === "Floor",
  );
  const passedOther = sorted.find(
    (a) =>
      a.chamber === otherChamber &&
      /passed|agreed/i.test(a.text) &&
      a.type === "Floor",
  );
  const becameLaw = sorted.find((a) =>
    /became public law|signed by president/i.test(a.text),
  );
  const sentBack = sorted.find((a) =>
    /message on (house|senate) action received/i.test(a.text) &&
    /amendment/i.test(a.text),
  );
  const latestAction = sorted[0];

  // If it became law, trust that
  if (becameLaw) return null; // GovTrack's enacted status is fine

  // GovTrack says passed_bill but there's evidence the bill was sent back
  // with amendments and the receiving chamber is still deliberating
  if (govtrackStatus === "passed_bill" && sentBack) {
    // Check if the "sent back" action is AFTER the second chamber's passage
    const sentBackDate = new Date(sentBack.actionDate).getTime();
    const secondPassDate = passedOther
      ? new Date(passedOther.actionDate).getTime()
      : 0;

    if (sentBackDate >= secondPassDate) {
      // The bill was sent back after the other chamber passed it with amendments.
      // Determine which chamber sent it back.
      if (/house action/i.test(sentBack.text)) {
        return "pass_back_house";
      }
      if (/senate action/i.test(sentBack.text)) {
        return "pass_back_senate";
      }
    }
  }

  // GovTrack says passed_bill but latest actions show ongoing deliberation
  // in one chamber (cloture motions, motions to table, etc.)
  if (govtrackStatus === "passed_bill" && latestAction) {
    const latestDate = new Date(latestAction.actionDate).getTime();
    const govtrackPassDate = passedOther
      ? new Date(passedOther.actionDate).getTime()
      : 0;

    // If there's significant activity AFTER what GovTrack considers passage,
    // the bill is still being worked on
    if (latestDate > govtrackPassDate && latestAction.chamber) {
      const isDeliberation =
        /considered|cloture|motion to table|motion to refer|motion to concur/i.test(
          latestAction.text,
        );
      if (isDeliberation) {
        // Bill is back in this chamber — figure out which pass_back status
        if (latestAction.chamber === "House") return "pass_back_house";
        if (latestAction.chamber === "Senate") return "pass_back_senate";
      }
    }
  }

  // GovTrack says introduced but congress.gov shows it passed a chamber
  if (govtrackStatus === "introduced" || govtrackStatus === "reported") {
    if (passedOrigin && passedOther) return "passed_bill";
    if (passedOrigin) {
      return originIsHouse ? "pass_over_house" : "pass_over_senate";
    }
  }

  return null; // GovTrack status looks fine
}

/**
 * Fetch actions from congress.gov for bills that might have stale statuses,
 * store the actions, and reconcile the bill's currentStatus if needed.
 */
export async function fetchBillActionsFunction(targetBillIds?: string[], limit = 100) {
  console.log(
    "Fetching bill actions for:",
    targetBillIds?.join(", ") || `up to ${limit} active bills with non-terminal statuses`,
  );

  try {
    // Fetch bills that aren't in a terminal state (enacted) — those might
    // have stale statuses. If specific IDs given, use those.
    const bills = targetBillIds?.length
      ? await prisma.bill.findMany({
          where: { billId: { in: targetBillIds } },
        })
      : await prisma.bill.findMany({
          where: {
            currentStatus: {
              not: { startsWith: "enacted_" },
            },
            // Only check bills from recent congresses
            introducedDate: { gte: new Date("2023-01-01") },
          },
          orderBy: { currentStatusDate: "desc" },
          take: limit,
        });

    console.log(`Found ${bills.length} bills to check.`);

    let actionsStored = 0;
    let statusesFixed = 0;

    for (const bill of bills) {
      try {
        const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
        if (!congress || !apiBillType || !billNumber) {
          console.warn(`Skipping ${bill.billId} — invalid parse.`);
          continue;
        }

        const actions = await fetchBillActions(congress, apiBillType, billNumber);
        if (!actions || actions.length === 0) {
          console.warn(`No actions found for ${bill.billId}.`);
          continue;
        }

        // Store actions (upsert to avoid duplicates)
        for (const action of actions) {
          if (!action.actionDate || !action.text) continue;

          await prisma.billAction.upsert({
            where: {
              billId_actionDate_text: {
                billId: bill.id,
                actionDate: new Date(action.actionDate),
                text: action.text,
              },
            },
            update: {},
            create: {
              billId: bill.id,
              actionDate: new Date(action.actionDate),
              chamber: action.chamber,
              text: action.text,
              actionType: action.type,
            },
          });
        }
        actionsStored += actions.length;

        // Reconcile status
        const correctedStatus = reconcileStatus(
          bill.currentStatus,
          bill.billType,
          actions,
        );

        if (correctedStatus && correctedStatus !== bill.currentStatus) {
          console.log(
            `STATUS FIX: ${bill.billId} "${bill.title.slice(0, 60)}" — ` +
              `${bill.currentStatus} → ${correctedStatus}`,
          );

          // Find the date of the latest action for the corrected status date
          const latestAction = actions.reduce((latest, a) =>
            new Date(a.actionDate) > new Date(latest.actionDate) ? a : latest,
          );

          await prisma.bill.update({
            where: { id: bill.id },
            data: {
              currentStatus: correctedStatus,
              currentStatusDate: new Date(latestAction.actionDate),
            },
          });
          statusesFixed++;
        } else {
          console.log(
            `OK: ${bill.billId} — ${bill.currentStatus} (${actions.length} actions)`,
          );
        }
      } catch (error: unknown) {
        console.error(
          `Error processing ${bill.billId}:`,
          error instanceof Error ? error.message : error,
        );
      }

      // Rate limit: congress.gov allows ~1 req/sec with a registered key
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(
      `Done. Stored actions for ${bills.length} bills (${actionsStored} actions total). Fixed ${statusesFixed} statuses.`,
    );
  } catch (error: unknown) {
    console.error(
      "Error in fetchBillActions:",
      error instanceof Error ? error.message : error,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const billIds = process.argv.slice(2);
  fetchBillActionsFunction(billIds.length > 0 ? billIds : undefined);
}
