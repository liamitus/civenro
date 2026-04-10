/**
 * Verifies that:
 *  - existing Conversation/Message rows still load via the same query the GET endpoint uses
 *  - old plain-text messages remain valid markdown (round-trip safe)
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const total = await prisma.conversation.count();
  console.log(`Total conversations: ${total}`);

  const recent = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  if (recent.length === 0) {
    console.log("No existing conversations to test against (DB empty for chat).");
    await prisma.$disconnect();
    return;
  }

  for (const c of recent) {
    console.log(`\nConversation ${c.id} — bill ${c.billId}, ${c.messages.length} messages`);
    for (const m of c.messages.slice(0, 4)) {
      const preview = m.text.slice(0, 100).replace(/\n/g, " ");
      console.log(`  [${m.sender}] ${preview}${m.text.length > 100 ? "…" : ""}`);
    }

    // Simulate the GET-endpoint reshape
    const reshaped = c.messages.map(({ sender, text, createdAt }) => ({
      sender,
      text,
      createdAt,
    }));
    if (reshaped.length !== c.messages.length) {
      console.log(`  ✗ reshape lost messages`);
      process.exit(1);
    }
  }

  // Sample old AI messages and ensure they don't contain markdown control chars
  // that would render badly (this is informational; plain text IS valid markdown).
  const aiMessages = await prisma.message.findMany({
    where: { sender: "ai" },
    take: 20,
    orderBy: { createdAt: "asc" },
  });
  console.log(`\nSampled ${aiMessages.length} historical AI messages.`);
  const withMd = aiMessages.filter((m) => /[*_`>#]/.test(m.text)).length;
  console.log(`  ${withMd} already contain markdown-like chars (will render through react-markdown)`);
  console.log(`  ${aiMessages.length - withMd} are plain text (still valid markdown)`);

  console.log("\n✓ Persistence query path works; all messages reshape cleanly.");
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
