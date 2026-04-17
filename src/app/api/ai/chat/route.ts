import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";
import { generateBillChatResponse } from "@/lib/ai";
import { parseSectionsFromFullText } from "@/lib/bill-sections";
import type { BillMetadata } from "@/lib/congress-api";
import { assertAiEnabled, AiDisabledError } from "@/lib/ai-gate";
import { recordSpend } from "@/lib/budget";
import { assertUserRateLimit, RateLimitError } from "@/lib/rate-limit";
import { getCachedResponse, setCachedResponse } from "@/lib/ai-cache";
import { reportError } from "@/lib/error-reporting";

/** Max characters allowed in a single user message. */
const MAX_MESSAGE_LENGTH = 2000;

/** Max AI chat requests per user per hour. */
const MAX_CHAT_PER_USER_PER_HOUR = 20;

export async function GET(request: NextRequest) {
  const { userId, error } = await getAuthenticatedUserId();
  if (error) return error;

  const billId = request.nextUrl.searchParams.get("billId");

  if (!billId) {
    return NextResponse.json(
      { error: "Missing required query parameter: billId." },
      { status: 400 },
    );
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { billId: parseInt(billId), userId },
      orderBy: { createdAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 },
      );
    }

    const messages = conversation.messages.map(
      ({ sender, text, createdAt }) => ({
        sender,
        text,
        createdAt,
      }),
    );

    return NextResponse.json({ createdAt: conversation.createdAt, messages });
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId();
  if (authError) return authError;

  try {
    const { billId, userMessage, conversationId } = await request.json();

    if (!billId || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }

    // Input length guard — reject oversized prompts before they burn tokens.
    if (
      typeof userMessage !== "string" ||
      userMessage.length > MAX_MESSAGE_LENGTH
    ) {
      return NextResponse.json(
        { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
        { status: 400 },
      );
    }

    // Per-user rate limit — DB-backed, persists across serverless instances.
    await assertUserRateLimit(userId, "chat", MAX_CHAT_PER_USER_PER_HOUR);

    // Budget gate — throws AiDisabledError if Govroll is out of AI budget.
    await assertAiEnabled("chat");

    const numericBillId = parseInt(billId);

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation || conversation.userId !== userId) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 },
        );
      }
    } else {
      conversation = await prisma.conversation.create({
        data: { userId, billId: numericBillId },
      });
    }

    // Store user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "user",
        text: userMessage,
      },
    });

    // Fetch conversation history
    const recentMessages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: 10,
    });

    // Fetch bill row + latest text version in parallel
    const [bill, latestVersion] = await Promise.all([
      prisma.bill.findUnique({ where: { id: numericBillId } }),
      prisma.billTextVersion.findFirst({
        where: { billId: numericBillId, fullText: { not: null } },
        orderBy: { versionDate: "desc" },
        select: { fullText: true },
      }),
    ]);

    const rawText = latestVersion?.fullText || bill?.fullText || null;
    const billSections = rawText ? parseSectionsFromFullText(rawText) : null;

    // Read cached metadata directly off the Bill row (backfilled by fetch-bill-text).
    const metadata: BillMetadata | null = bill
      ? {
          sponsor: bill.sponsor,
          cosponsorCount: bill.cosponsorCount,
          cosponsorPartySplit: bill.cosponsorPartySplit,
          policyArea: bill.policyArea,
          latestActionDate: bill.latestActionDate
            ? bill.latestActionDate.toISOString().slice(0, 10)
            : null,
          latestActionText: bill.latestActionText,
          shortText: bill.shortText,
        }
      : null;

    const conversationHistory = recentMessages
      .slice(0, -1) // exclude the message we just added
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    // Cache check — only for first-turn messages (no prior history) since
    // those are the most commonly duplicated across users.
    const isFirstTurn = conversationHistory.length === 0;
    if (isFirstTurn) {
      const cached = await getCachedResponse(numericBillId, userMessage);
      if (cached) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "ai",
            text: cached.response,
          },
        });
        // Record as zero-cost cache hit for tracking.
        try {
          await recordSpend({
            userId,
            feature: "chat",
            model: `${cached.model}:cache-hit`,
            inputTokens: 0,
            outputTokens: 0,
          });
        } catch {
          // Non-critical
        }
        return NextResponse.json({
          conversationId: conversation.id,
          aiAnswer: cached.response,
        });
      }
    }

    const aiResult = await generateBillChatResponse(
      bill?.title || "Unknown Bill",
      billSections,
      conversationHistory,
      userMessage,
      metadata,
    );

    // Log every provider call to the budget ledger. Done after the response so
    // a failure to record spend doesn't break the user's chat turn.
    for (const u of aiResult.usage) {
      try {
        await recordSpend({
          userId,
          feature: "chat",
          model: u.model,
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
        });
      } catch (err) {
        console.error("Failed to record AI spend:", err);
      }
    }

    // Cache the response for future identical first-turn queries on this bill.
    if (isFirstTurn) {
      try {
        const modelUsed = aiResult.usage[0]?.model ?? "unknown";
        await setCachedResponse(
          numericBillId,
          userMessage,
          aiResult.content,
          modelUsed,
        );
      } catch {
        // Non-critical — cache write failure shouldn't break the response.
      }
    }

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ai",
        text: aiResult.content,
      },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      aiAnswer: aiResult.content,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(error.toJSON(), { status: 429 });
    }
    if (error instanceof AiDisabledError) {
      return NextResponse.json(error.toJSON(), { status: 503 });
    }
    console.error(
      JSON.stringify({
        event: "api_error",
        route: "POST /api/ai/chat",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    reportError(error, { route: "POST /api/ai/chat" });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
