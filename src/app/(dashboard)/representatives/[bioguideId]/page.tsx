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
    select: { firstName: true, lastName: true, state: true, party: true, chamber: true },
  });

  const name = rep ? `${rep.firstName} ${rep.lastName}` : "Representative";
  const title = `${name} — Govroll`;
  const description = rep
    ? `See how ${rep.firstName} ${rep.lastName} (${rep.party}-${rep.state}) votes in the ${rep.chamber === "senate" ? "Senate" : "House"} and compare with public opinion.`
    : "See how this representative votes and compare with public opinion.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "Govroll",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
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
