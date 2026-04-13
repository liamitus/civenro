import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { reportError } from "@/lib/error-reporting";

export async function DELETE() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Account deletion is not configured. Contact support." },
      { status: 500 }
    );
  }

  try {
    // 1. Anonymize comments — preserve content for thread continuity
    await prisma.comment.updateMany({
      where: { userId: user.id },
      data: { userId: null, username: "Deleted User" },
    });

    // 2. Delete private data
    await prisma.$transaction([
      prisma.commentVote.deleteMany({ where: { userId: user.id } }),
      prisma.voteHistory.deleteMany({ where: { userId: user.id } }),
      prisma.vote.deleteMany({ where: { userId: user.id } }),
    ]);

    // Delete conversations + messages (messages cascade from conversation)
    await prisma.conversation.deleteMany({ where: { userId: user.id } });

    // 3. Nullify donation userId — keep records for accounting
    await prisma.donation.updateMany({
      where: { userId: user.id },
      data: { userId: null },
    });

    // 4. Delete Profile
    await prisma.profile.delete({ where: { id: user.id } }).catch(() => {
      // Profile may not exist for very old accounts
    });

    // 5. Delete Supabase auth user
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await adminClient.auth.admin.deleteUser(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting account:", err);
    reportError(err, { route: "DELETE /api/account/delete" });
    return NextResponse.json(
      { error: "Failed to delete account. Contact support." },
      { status: 500 }
    );
  }
}
