import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import {
  getBillTypeInfo,
  getJourneySteps,
  getStatusExplanation,
  getEffectiveStatus,
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
    select: { title: true, shortText: true },
  });

  const title = bill ? `${bill.title} — Govroll` : "Bill — Govroll";
  const description = bill?.shortText
    ?? "Track this bill, see how your representatives voted, and share your opinion.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Govroll",
      type: "article",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
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
  const effectiveStatus = getEffectiveStatus(
    bill.billType, bill.currentStatus, actions, textVersions,
  );
  const journeySteps = actions.length > 0
    ? buildDynamicJourney(bill.billType, bill.currentStatus, actions, textVersions, effectiveStatus)
    : getJourneySteps(bill.billType, effectiveStatus);
  const statusExplanation = getStatusExplanation(
    bill.billType,
    effectiveStatus,
  );
  const isEnacted = effectiveStatus.startsWith("enacted_");
  const isPassed =
    effectiveStatus.startsWith("passed_") ||
    effectiveStatus.startsWith("conference_") ||
    effectiveStatus.startsWith("pass_over_") ||
    effectiveStatus.startsWith("pass_back_");
  const isFailed =
    effectiveStatus.startsWith("fail_") ||
    effectiveStatus.startsWith("vetoed_") ||
    effectiveStatus.startsWith("prov_kill_");

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 space-y-5">
      {/* ── Title + expandable about section (title, journey, explainer, AI chat) ── */}
      <BillAboutSection
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
