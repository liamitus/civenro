import "dotenv/config";
import { createStandalonePrisma } from "../src/lib/prisma-standalone";

const prisma = createStandalonePrisma();

async function main() {
  console.log("Seeding database...");

  // --- Representatives ---
  const reps = await Promise.all([
    prisma.representative.upsert({
      where: { bioguideId: "P000197" },
      update: {},
      create: {
        bioguideId: "P000197",
        firstName: "Nancy",
        lastName: "Pelosi",
        state: "CA",
        district: "11",
        party: "Democrat",
        chamber: "representative",
        imageUrl: "https://bioguide.congress.gov/bioguide/photo/P/P000197.jpg",
        link: "https://www.govtrack.us/congress/members/nancy_pelosi/400314",
      },
    }),
    prisma.representative.upsert({
      where: { bioguideId: "C001098" },
      update: {},
      create: {
        bioguideId: "C001098",
        firstName: "Ted",
        lastName: "Cruz",
        state: "TX",
        district: null,
        party: "Republican",
        chamber: "senator",
        imageUrl: "https://bioguide.congress.gov/bioguide/photo/C/C001098.jpg",
        link: "https://www.govtrack.us/congress/members/ted_cruz/412573",
      },
    }),
    prisma.representative.upsert({
      where: { bioguideId: "O000172" },
      update: {},
      create: {
        bioguideId: "O000172",
        firstName: "Alexandria",
        lastName: "Ocasio-Cortez",
        state: "NY",
        district: "14",
        party: "Democrat",
        chamber: "representative",
        imageUrl: "https://bioguide.congress.gov/bioguide/photo/O/O000172.jpg",
        link: "https://www.govtrack.us/congress/members/alexandria_ocasio-cortez/412804",
      },
    }),
  ]);

  // --- Bills ---
  const bills = await Promise.all([
    prisma.bill.upsert({
      where: { billId: "house_bill-1-119" },
      update: {},
      create: {
        billId: "house_bill-1-119",
        title: "Tax Cuts and Jobs Act",
        date: new Date("2025-01-03"),
        billType: "house_bill",
        currentChamber: "house",
        currentStatus: "pass_over_house",
        currentStatusDate: new Date("2025-05-22"),
        introducedDate: new Date("2025-01-03"),
        link: "https://www.govtrack.us/congress/bills/119/hr1",
        sponsor: "Rep. Jason Smith [R-MO8]",
        policyArea: "Taxation",
        latestActionText: "Passed House with amendment.",
        latestActionDate: new Date("2025-05-22"),
        fullText:
          "SECTION 1. SHORT TITLE.\n\nThis Act may be cited as the 'One Big Beautiful Bill Act'.\n\nSEC. 2. FINDINGS.\n\nCongress finds the following:\n(1) The American people deserve a tax code that is simpler, fairer, and promotes economic growth.\n(2) Tax relief for working families is a top priority.",
      },
    }),
    prisma.bill.upsert({
      where: { billId: "senate_bill-100-119" },
      update: {},
      create: {
        billId: "senate_bill-100-119",
        title: "Protecting Americans' Data from Foreign Adversaries Act",
        date: new Date("2025-01-15"),
        billType: "senate_bill",
        currentChamber: "senate",
        currentStatus: "introduced",
        currentStatusDate: new Date("2025-01-15"),
        introducedDate: new Date("2025-01-15"),
        link: "https://www.govtrack.us/congress/bills/119/s100",
        sponsor: "Sen. Mark Warner [D-VA]",
        policyArea: "Science, Technology, Communications",
        latestActionText:
          "Read twice and referred to the Committee on Commerce, Science, and Transportation.",
        latestActionDate: new Date("2025-01-15"),
        fullText:
          "SECTION 1. SHORT TITLE.\n\nThis Act may be cited as the 'Protecting Americans' Data from Foreign Adversaries Act'.\n\nSEC. 2. PURPOSE.\n\nThe purpose of this Act is to establish standards for the protection of sensitive personal data of United States persons from access by foreign adversaries.",
      },
    }),
    prisma.bill.upsert({
      where: { billId: "house_bill-200-119" },
      update: {},
      create: {
        billId: "house_bill-200-119",
        title: "Secure the Border Act",
        date: new Date("2025-01-10"),
        billType: "house_bill",
        currentChamber: "house",
        currentStatus: "reported",
        currentStatusDate: new Date("2025-03-01"),
        introducedDate: new Date("2025-01-10"),
        link: "https://www.govtrack.us/congress/bills/119/hr200",
        sponsor: "Rep. Mark Green [R-TN7]",
        policyArea: "Immigration",
        latestActionText: "Reported by the Committee on Homeland Security.",
        latestActionDate: new Date("2025-03-01"),
      },
    }),
  ]);

  // --- Representative Votes ---
  await Promise.all([
    prisma.representativeVote.upsert({
      where: {
        representativeId_billId_rollCallNumber: {
          representativeId: reps[0].id,
          billId: bills[0].id,
          rollCallNumber: 1,
        },
      },
      update: {},
      create: {
        representativeId: reps[0].id,
        billId: bills[0].id,
        vote: "No",
        rollCallNumber: 1,
        chamber: "house",
        votedAt: new Date("2025-05-22"),
        category: "passage",
      },
    }),
    prisma.representativeVote.upsert({
      where: {
        representativeId_billId_rollCallNumber: {
          representativeId: reps[2].id,
          billId: bills[0].id,
          rollCallNumber: 1,
        },
      },
      update: {},
      create: {
        representativeId: reps[2].id,
        billId: bills[0].id,
        vote: "No",
        rollCallNumber: 1,
        chamber: "house",
        votedAt: new Date("2025-05-22"),
        category: "passage",
      },
    }),
  ]);

  // --- Bill Actions ---
  await prisma.billAction.upsert({
    where: {
      billId_actionDate_text: {
        billId: bills[0].id,
        actionDate: new Date("2025-01-03"),
        text: "Introduced in House",
      },
    },
    update: {},
    create: {
      billId: bills[0].id,
      actionDate: new Date("2025-01-03"),
      chamber: "House",
      text: "Introduced in House",
      actionType: "IntroReferral",
    },
  });

  // --- Budget Ledger (bootstrap entry) ---
  const period = new Date().toISOString().slice(0, 7);
  await prisma.budgetLedger.upsert({
    where: { period },
    update: {},
    create: {
      period,
      incomeCents: 0,
      spendCents: 0,
      reserveCents: 0,
      aiEnabled: true,
      aiDisabledReason: "bootstrap",
    },
  });

  console.log("Seeded:");
  console.log(`  ${reps.length} representatives`);
  console.log(`  ${bills.length} bills`);
  console.log(`  2 representative votes`);
  console.log(`  1 bill action`);
  console.log(`  1 budget ledger entry (${period})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
