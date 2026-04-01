import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { RepHero } from "@/components/representatives/rep-hero";
import { RepDetailInteractive } from "@/components/representatives/rep-detail-interactive";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;
  const rep = await prisma.representative.findUnique({
    where: { bioguideId },
    select: { firstName: true, lastName: true },
  });

  return {
    title: rep
      ? `${rep.firstName} ${rep.lastName} — Civenro`
      : "Representative — Civenro",
  };
}

export default async function RepresentativeDetailPage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;
  const rep = await prisma.representative.findUnique({
    where: { bioguideId },
  });

  if (!rep) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <RepHero rep={rep} />
      <Separator className="my-6" />
      <RepDetailInteractive bioguideId={bioguideId} />
    </div>
  );
}
