import { NextRequest, NextResponse } from "next/server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isTextUIPart,
  type UIMessage,
} from "ai";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUserId } from "@/lib/auth";
import {
  streamBillChatResponse,
  selectSectionsForQuestion,
  shouldFilterSections,
  type AiUsageRecord,
} from "@/lib/ai";
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

/**
 * Fluid Compute lets Hobby reach 300s. Bill chat is typically 5–15s end to
 * end; we set the ceiling generously so extremely large bills don't get
 * truncated.
 */
export const maxDuration = 300;

/** Metadata streamed to the client so `useChat` can learn the conversation id. */
interface ChatMessageMetadata {
  conversationId?: string;
}

// ─────────────────────────────────────────────────────────────────────────
//  GET — hydrate the most recent conversation for this bill + user
// ─────────────────────────────────────────────────────────────────────────

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

    return NextResponse.json({
      conversationId: conversation.id,
      createdAt: conversation.createdAt,
      messages,
    });
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────
//  POST — streaming chat turn via Vercel AI Gateway
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { userId, error: authError } = await getAuthenticatedUserId();
  if (authError) return authError;

  let body: {
    messages?: UIMessage[];
    billId?: string | number;
    conversationId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed request body." },
      { status: 400 },
    );
  }

  const uiMessages = Array.isArray(body.messages) ? body.messages : [];
  const lastMessage = uiMessages[uiMessages.length - 1];
  const userMessageText = lastMessage
    ? lastMessage.parts
        .filter(isTextUIPart)
        .map((p) => p.text)
        .join("")
        .trim()
    : "";

  if (!body.billId || !userMessageText) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 },
    );
  }

  if (userMessageText.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      { status: 400 },
    );
  }

  try {
    // ── Pre-stream gates ───────────────────────────────────────────────
    await assertUserRateLimit(userId, "chat", MAX_CHAT_PER_USER_PER_HOUR);
    await assertAiEnabled("chat");

    const numericBillId =
      typeof body.billId === "number" ? body.billId : parseInt(body.billId);

    // ── Conversation resolution + user message persistence ─────────────
    let conversation;
    if (body.conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: body.conversationId },
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

    // Persist the user message pre-stream so a mid-stream failure still
    // leaves the user's turn in the thread for retry.
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "user",
        text: userMessageText,
      },
    });

    // ── Bill context ───────────────────────────────────────────────────
    const [bill, latestVersion] = await Promise.all([
      prisma.bill.findUnique({ where: { id: numericBillId } }),
      prisma.billTextVersion.findFirst({
        where: { billId: numericBillId, fullText: { not: null } },
        orderBy: { versionDate: "desc" },
        select: { fullText: true },
      }),
    ]);

    const rawText = latestVersion?.fullText || bill?.fullText || null;
    const allSections = rawText ? parseSectionsFromFullText(rawText) : null;
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

    // ── First-turn cache short-circuit ─────────────────────────────────
    // Previously stored conversation messages (before this turn) count:
    // uiMessages length minus the one we just added.
    const isFirstTurn = uiMessages.length <= 1;
    if (isFirstTurn) {
      const cached = await getCachedResponse(numericBillId, userMessageText);
      if (cached) {
        // Persist AI response row + ledger entry, then synthesize a stream
        // so the client uses a single code path for cache and live paths.
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "ai",
            text: cached.response,
          },
        });
        try {
          await recordSpend({
            userId,
            feature: "chat",
            model: `${cached.model}:cache-hit`,
            inputTokens: 0,
            outputTokens: 0,
          });
        } catch {
          // non-critical
        }

        return emitSyntheticTextStream({
          text: cached.response,
          conversationId: conversation.id,
        });
      }
    }

    // ── Large-bill pre-filter (non-streaming) ──────────────────────────
    let sectionsToUse = allSections;
    if (allSections && shouldFilterSections(allSections)) {
      const filtered = await selectSectionsForQuestion(
        bill?.title || "Unknown Bill",
        allSections,
        userMessageText,
      );
      sectionsToUse = filtered.sections;
      await tryRecordSpend({
        userId,
        feature: "chat",
        usage: filtered.usage,
      });
    }

    // ── Main streaming call ────────────────────────────────────────────
    const streamResult = await streamBillChatResponse({
      billTitle: bill?.title || "Unknown Bill",
      billSections: sectionsToUse,
      metadata,
      uiMessages,
      onFinish: async ({ text, usage }) => {
        await tryRecordSpend({ userId, feature: "chat", usage });

        if (isFirstTurn) {
          try {
            await setCachedResponse(
              numericBillId,
              userMessageText,
              text,
              usage.model,
            );
          } catch {
            // non-critical — cache write failure shouldn't break the response
          }
        }

        try {
          await prisma.message.create({
            data: {
              conversationId: conversation.id,
              sender: "ai",
              text,
            },
          });
        } catch (err) {
          console.error("Failed to persist AI message:", err);
          reportError(err, { route: "POST /api/ai/chat onFinish" });
        }
      },
      onError: ({ error }) => {
        console.error(
          JSON.stringify({
            event: "api_error",
            route: "POST /api/ai/chat stream",
            error: error instanceof Error ? error.message : String(error),
          }),
        );
        reportError(error, { route: "POST /api/ai/chat stream" });
      },
    });

    return streamResult.toUIMessageStreamResponse<
      UIMessage<ChatMessageMetadata>
    >({
      messageMetadata: ({ part }) => {
        if (part.type === "start") {
          return { conversationId: conversation.id };
        }
        return undefined;
      },
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

// ─────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────

async function tryRecordSpend(args: {
  userId: string;
  feature: "chat";
  usage: AiUsageRecord;
}) {
  try {
    await recordSpend({
      userId: args.userId,
      feature: args.feature,
      model: args.usage.model,
      inputTokens: args.usage.inputTokens,
      outputTokens: args.usage.outputTokens,
    });
  } catch (err) {
    console.error("Failed to record AI spend:", err);
  }
}

/**
 * Produce a minimal UIMessage stream carrying a single pre-computed text
 * payload. Used for cache hits so the client gets an identical streaming
 * shape regardless of whether the answer came from the model or cache.
 */
function emitSyntheticTextStream(args: {
  text: string;
  conversationId: string;
}): Response {
  const stream = createUIMessageStream<UIMessage<ChatMessageMetadata>>({
    execute: ({ writer }) => {
      const id = "cache";
      writer.write({
        type: "start",
        messageMetadata: { conversationId: args.conversationId },
      });
      writer.write({ type: "text-start", id });
      writer.write({ type: "text-delta", id, delta: args.text });
      writer.write({ type: "text-end", id });
      writer.write({ type: "finish" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
