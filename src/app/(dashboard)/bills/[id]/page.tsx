import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import {
  getBillTypeInfo,
  getJourneySteps,
  getStatusExplanation,
  buildDynamicJourney,
} from "@/lib/bill-helpers";
import { BillAboutSection } from "@/components/bills/bill-about-section";
import { BillDetailInteractive } from "./interactive";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bill = await prisma.bill.findUnique({
    where: { id: parseInt(id) },
    select: { title: true },
  });

  return {
    title: bill ? `${bill.title} — Civenro` : "Bill — Civenro",
  };
}

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const billId = parseInt(id);

  const [bill, actions, textVersions] = await Promise.all([
    prisma.bill.findUnique({ where: { id: billId } }),
    prisma.billAction.findMany({
      where: { billId },
      orderBy: { actionDate: "asc" },
      select: { actionDate: true, chamber: true, text: true, actionType: true },
    }),
    prisma.billTextVersion.findMany({
      where: { billId },
      orderBy: { versionDate: "asc" },
      select: {
        versionCode: true, versionType: true, versionDate: true,
        changeSummary: true, isSubstantive: true,
      },
    }),
  ]);

  if (!bill) notFound();

  const typeInfo = getBillTypeInfo(bill.billType);
  const journeySteps = actions.length > 0
    ? buildDynamicJourney(bill.billType, bill.currentStatus, actions, textVersions)
    : getJourneySteps(bill.billType, bill.currentStatus);
  const statusExplanation = getStatusExplanation(
    bill.billType,
    bill.currentStatus,
  );
  const isEnacted = bill.currentStatus.startsWith("enacted_");
  const isPassed =
    bill.currentStatus.startsWith("passed_") ||
    bill.currentStatus.startsWith("conference_") ||
    bill.currentStatus.startsWith("pass_over_") ||
    bill.currentStatus.startsWith("pass_back_");
  const isFailed =
    bill.currentStatus.startsWith("fail_") ||
    bill.currentStatus.startsWith("vetoed_") ||
    bill.currentStatus.startsWith("prov_kill_");

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
      {/* ── Title + expandable about section (title, journey, explainer, AI chat) ── */}
      <BillAboutSection
        billId={bill.id}
        title={bill.title}
        shortText={bill.shortText}
        introducedDate={dayjs(bill.introducedDate).format("MMM D, YYYY")}
        lastActionDate={
          bill.currentStatusDate && bill.currentStatus !== "introduced"
            ? dayjs(bill.currentStatusDate).format("MMM D, YYYY")
            : null
        }
        link={bill.link}
        typeLabel={typeInfo.label}
        typeDescription={typeInfo.description}
        statusHeadline={statusExplanation.headline}
        statusDetail={statusExplanation.detail}
        statusStyle={
          isEnacted
            ? "bg-enacted-soft text-enacted border-0"
            : isFailed
              ? "bg-failed-soft text-failed border-0"
              : isPassed
                ? "bg-passed-soft text-passed border-0"
                : "bg-muted text-muted-foreground border-0"
        }
        chamberStyle={
          bill.billType.startsWith("house")
            ? "border-house text-house"
            : "border-senate text-senate"
        }
        journeySteps={journeySteps}
      />

      {/* ── Engagement sections (reps, votes, discussion) ── */}
      <BillDetailInteractive billId={bill.id} />
    </div>
  );
}
