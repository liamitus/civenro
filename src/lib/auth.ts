import { createSupabaseServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Get the authenticated user ID from the request, or return an error response.
 */
export async function getAuthenticatedUserId(): Promise<
  | { userId: string; error: null }
  | { userId: null; error: NextResponse }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      userId: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { userId: user.id, error: null };
}
