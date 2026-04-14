import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

// Regenerate hourly so new bills/reps appear without a redeploy
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.govroll.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/bills`, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/support`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/made-possible-by`, changeFrequency: "weekly", priority: 0.4 },
  ];

  const [bills, reps] = await Promise.all([
    prisma.bill.findMany({
      select: { id: true, currentStatusDate: true },
      orderBy: { currentStatusDate: "desc" },
    }),
    prisma.representative.findMany({
      select: { bioguideId: true, slug: true },
    }),
  ]);

  const billRoutes: MetadataRoute.Sitemap = bills.map((bill) => ({
    url: `${base}/bills/${bill.id}`,
    lastModified: bill.currentStatusDate,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const repRoutes: MetadataRoute.Sitemap = reps.map((rep) => ({
    url: `${base}/representatives/${rep.slug || rep.bioguideId}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...billRoutes, ...repRoutes];
}
