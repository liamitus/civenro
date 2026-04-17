/**
 * Backfill Profile records from existing userId values across all tables.
 *
 * Run: npx tsx scripts/backfill-profiles.ts
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@supabase/supabase-js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function resolveUsername(user: {
  id: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const username = meta.username as string | undefined;
  if (username && username !== "Anonymous" && username.trim()) {
    return username.trim();
  }
  const fullName = (meta.full_name ?? meta.name) as string | undefined;
  if (fullName && fullName.trim()) {
    const firstName = fullName.trim().split(/\s+/)[0];
    if (firstName.length >= 2) return firstName;
  }
  // Deterministic fallback
  const hex = user.id.replace(/-/g, "").slice(-4);
  const num = parseInt(hex, 16) % 10000;
  return `Citizen-${String(num).padStart(4, "0")}`;
}

async function main() {
  // Collect all distinct userIds across tables
  const [
    commentUsers,
    voteUsers,
    voteHistoryUsers,
    conversationUsers,
    commentVoteUsers,
    donationUsers,
  ] = await Promise.all([
    prisma.comment.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.vote.findMany({ distinct: ["userId"], select: { userId: true } }),
    prisma.voteHistory.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.conversation.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.commentVote.findMany({
      distinct: ["userId"],
      select: { userId: true },
    }),
    prisma.donation.findMany({
      distinct: ["userId"],
      select: { userId: true },
      where: { userId: { not: null } },
    }),
  ]);

  const allUserIds = new Set<string>();
  for (const list of [
    commentUsers,
    voteUsers,
    voteHistoryUsers,
    conversationUsers,
    commentVoteUsers,
  ]) {
    for (const row of list) {
      if (row.userId) allUserIds.add(row.userId);
    }
  }
  for (const row of donationUsers) {
    if (row.userId) allUserIds.add(row.userId);
  }

  console.log(`Found ${allUserIds.size} distinct userIds to backfill`);

  // Check which already have profiles
  const existingProfiles = await prisma.profile.findMany({
    select: { id: true },
  });
  const existingIds = new Set(existingProfiles.map((p) => p.id));

  const toCreate = [...allUserIds].filter((id) => !existingIds.has(id));
  console.log(
    `${existingIds.size} already have profiles, ${toCreate.length} need backfill`,
  );

  // Process in batches
  const BATCH_SIZE = 50;
  let created = 0;
  let failed = 0;

  for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
    const batch = toCreate.slice(i, i + BATCH_SIZE);

    for (const userId of batch) {
      try {
        const { data, error } = await supabase.auth.admin.getUserById(userId);

        if (error || !data.user) {
          // User no longer exists in Supabase — create tombstone profile
          await prisma.profile.create({
            data: { id: userId, username: "Deleted User" },
          });
          console.log(`  [tombstone] ${userId}`);
        } else {
          const username = resolveUsername(data.user);
          await prisma.profile.create({
            data: {
              id: userId,
              username,
              email: data.user.email ?? null,
            },
          });
          console.log(`  [created] ${userId} -> ${username}`);
        }
        created++;
      } catch (err) {
        console.error(`  [error] ${userId}:`, err);
        failed++;
      }
    }

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < toCreate.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `\nDone: ${created} created, ${failed} failed, ${existingIds.size} already existed`,
  );

  // Also update comment usernames from the newly created profiles
  const profiles = await prisma.profile.findMany({
    select: { id: true, username: true },
  });

  for (const profile of profiles) {
    const result = await prisma.comment.updateMany({
      where: { userId: profile.id, username: "Anonymous" },
      data: { username: profile.username },
    });
    if (result.count > 0) {
      console.log(
        `  Updated ${result.count} anonymous comments for ${profile.username}`,
      );
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
