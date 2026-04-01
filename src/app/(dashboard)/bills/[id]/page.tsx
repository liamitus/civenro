import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BillDetailInteractive } from "./interactive";

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const bill = await prisma.bill.findUnique({
    where: { id: parseInt(id) },
  });

  if (!bill) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      {/* SSR bill header */}
      <div className="space-y-3">
        <h1 className="text-xl font-bold leading-tight">{bill.title}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {bill.billType.startsWith("house") ? "House" : "Senate"}
          </Badge>
          <Badge variant="secondary">{formatStatus(bill.currentStatus)}</Badge>
          <span className="text-sm text-muted-foreground">
            Introduced {dayjs(bill.introducedDate).format("MMMM D, YYYY")}
          </span>
        </div>

        {bill.link && (
          <a
            href={bill.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline"
          >
            View on GovTrack &rarr;
          </a>
        )}
      </div>

      <Separator className="my-6" />

      {/* Client-side interactive sections */}
      <BillDetailInteractive billId={bill.id} />
    </div>
  );
}
