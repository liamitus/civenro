import { prisma } from "@/lib/prisma";

/**
 * Check if a Supabase user ID has admin privileges.
 * Admin status is stored in the AdminUser table, not in Supabase claims,
 * so it's fully under Govroll's control.
 */
export async function isAdmin(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId) return false;
  const admin = await prisma.adminUser.findUnique({
    where: { userId },
    select: { id: true },
  });
  return !!admin;
}
