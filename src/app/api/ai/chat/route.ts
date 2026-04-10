import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBillChatResponse } from "@/lib/ai";
import { parseSectionsFromFullText } from "@/lib/bill-sections";
import type { BillMetadata } from "@/lib/congress-api";
import { assertAiEnabled, AiDisabledError } from "@/lib/ai-gate";
import { recordSpend } from "@/lib/budget";

export async function GET(request: NextRequest) {
  const billId = request.nextUrl.searchParams.get("billId");
  const userId = request.nextUrl.searchParams.get("userId");

  if (!billId || !userId) {
    return NextResponse.json(
      { error: "Missing required query parameters: billId and userId." },
      { status: 400 }
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
        { status: 404 }
      );
    }

    const messages = conversation.messages.map(({ sender, text, createdAt }) => ({
      sender,
      text,
      createdAt,
    }));

    return NextResponse.json({ createdAt: conversation.createdAt, messages });
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, billId, userMessage, conversationId } =
      await request.json();

    if (!userId || !billId || !userMessage) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    // Budget gate — throws AiDisabledError if Civenro is out of AI budget.
    await assertAiEnabled("chat");

    const numericBillId = parseInt(billId);

    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });
      if (!conversation) {
        return NextResponse.json(
          { error: "Conversation not found." },
          { status: 404 }
        );
      }
    } else {
      conversation = await prisma.conversation.create({
        data: { userId: String(userId), billId: numericBillId },
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
        }
      : null;

    const conversationHistory = recentMessages
      .slice(0, -1) // exclude the message we just added
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

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
          userId: String(userId),
          feature: "chat",
          model: u.model,
          inputTokens: u.inputTokens,
          outputTokens: u.outputTokens,
        });
      } catch (err) {
        console.error("Failed to record AI spend:", err);
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
    if (error instanceof AiDisabledError) {
      return NextResponse.json(error.toJSON(), { status: 503 });
    }
    console.error("Error in /ai/chat route:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
