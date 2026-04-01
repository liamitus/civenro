import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateBillChatResponse } from "@/lib/ai";

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

    // Fetch the bill with full text for context stuffing
    const bill = await prisma.bill.findUnique({
      where: { id: numericBillId },
    });

    const conversationHistory = recentMessages
      .slice(0, -1) // exclude the message we just added
      .map((m) => ({
        role: m.sender === "user" ? ("user" as const) : ("assistant" as const),
        content: m.text,
      }));

    const aiAnswer = await generateBillChatResponse(
      bill?.title || "Unknown Bill",
      bill?.fullText || null,
      conversationHistory,
      userMessage
    );

    // Store AI response
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "ai",
        text: aiAnswer,
      },
    });

    return NextResponse.json({
      conversationId: conversation.id,
      aiAnswer,
    });
  } catch (error) {
    console.error("Error in /ai/chat route:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
