import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveUsername } from "@/lib/citizen-id";
import type { User } from "@supabase/supabase-js";

interface AuthSuccess {
  userId: string;
  user: User;
  username: string;
  error: null;
}

interface AuthError {
  userId: null;
  user: null;
  username: null;
  error: NextResponse;
}

/**
 * Get the authenticated user, ensuring a Profile row exists in the database.
 * Returns the userId, Supabase user object, and resolved username in one call.
 */
export async function getAuthenticatedUser(): Promise<AuthSuccess | AuthError> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      user: null,
      username: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const username = resolveUsername(user);

  // Lazy upsert: ensures Profile exists, updates username/email if changed
  await prisma.profile.upsert({
    where: { id: user.id },
    update: { username, email: user.email ?? null },
    create: { id: user.id, username, email: user.email ?? null },
  });

  return { userId: user.id, user, username, error: null };
}

/**
 * @deprecated Use getAuthenticatedUser() instead for Profile sync + username resolution.
 */
export async function getAuthenticatedUserId(): Promise<
  { userId: string; error: null } | { userId: null; error: NextResponse }
> {
  const result = await getAuthenticatedUser();
  if (result.error) {
    return { userId: null, error: result.error };
  }
  return { userId: result.userId, error: null };
}
