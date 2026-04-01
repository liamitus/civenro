/**
 * Provider-agnostic AI layer with context-stuffing approach.
 * Supports Anthropic Claude and OpenAI GPT.
 */

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  content: string;
}

type Provider = "anthropic" | "openai";

function detectProvider(): Provider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "No AI API key configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY."
  );
}

async function callAnthropic(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return { content: textBlock?.text || "" };
}

async function callOpenAI(
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<ChatResponse> {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  return { content: response.choices[0]?.message?.content || "" };
}

/**
 * Generate a chat response about a bill using context stuffing.
 */
export async function generateBillChatResponse(
  billTitle: string,
  billText: string | null,
  conversationHistory: ChatMessage[],
  userMessage: string
): Promise<string> {
  const provider = detectProvider();

  const systemPrompt = `You are a helpful, nonpartisan assistant that helps citizens understand U.S. legislation. You answer questions about bills clearly and accessibly, avoiding jargon where possible.

${billText ? `Here is the full text of the bill "${billTitle}":\n\n${billText}` : `The bill is titled "${billTitle}". Full text is not available, so answer based on the title and any context from the conversation.`}

Answer the user's question based on the bill text. If you're unsure about something, say so. Stay factual and neutral.`;

  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response =
    provider === "anthropic"
      ? await callAnthropic(systemPrompt, messages)
      : await callOpenAI(systemPrompt, messages);

  return response.content;
}
