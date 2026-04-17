import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let client: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  if (!client) {
    // Pool size 1 keeps subsequent raw SQL on the same connection — the
    // `SET LOCAL` trick inside resetDb depends on that.
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 1,
    });
    client = new PrismaClient({ adapter });
  }
  return client;
}

/**
 * Wipe every user table between tests. Uses DELETE rather than TRUNCATE —
 * TRUNCATE takes ACCESS EXCLUSIVE and deadlocks with the script modules'
 * long-lived connection pools (they don't disconnect between tests).
 * DELETE only needs row locks. `session_replication_role = replica`
 * disables FK checks so order doesn't matter — superuser-only, which the
 * testcontainer user is by default.
 */
export async function resetDb() {
  const db = getTestPrisma();
  const rows = await db.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma\\_%'`,
  );
  if (rows.length === 0) return;

  await db.$transaction(async (tx) => {
    // SET LOCAL scopes to this transaction — all DELETEs run on the same
    // connection with FK checks off, so order doesn't matter and we
    // don't need to replicate the FK dependency graph here.
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = replica");
    for (const { tablename } of rows) {
      await tx.$executeRawUnsafe(`DELETE FROM "public"."${tablename}"`);
    }
  });
}

export async function disconnectTestPrisma() {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
