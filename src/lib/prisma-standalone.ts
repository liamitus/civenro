/**
 * Prisma client for standalone scripts (not Next.js bundled).
 * Uses the PrismaPg adapter with DATABASE_URL from environment.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export function createStandalonePrisma() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}
