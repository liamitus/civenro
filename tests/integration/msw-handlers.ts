import { http, HttpResponse } from "msw";

/**
 * Safe, do-nothing defaults for every external host the cron routes touch.
 * A test that needs real-looking data overrides the specific endpoint with
 * `server.use(...)`. Anything not covered here triggers an "unhandled
 * request" error per the `onUnhandledRequest: "error"` setup.
 */
export const defaultHandlers = [
  // GovTrack
  http.get("https://www.govtrack.us/api/v2/bill", () =>
    HttpResponse.json({ objects: [], meta: { total_count: 0 } }),
  ),
  http.get("https://www.govtrack.us/api/v2/bill/:id", () =>
    HttpResponse.json({}, { status: 404 }),
  ),
  http.get("https://www.govtrack.us/api/v2/role", () =>
    HttpResponse.json({ objects: [], meta: { total_count: 0 } }),
  ),
  http.get("https://www.govtrack.us/api/v2/vote", () =>
    HttpResponse.json({ objects: [], meta: { total_count: 0 } }),
  ),
  http.get("https://www.govtrack.us/api/v2/vote_voter", () =>
    HttpResponse.json({ objects: [], meta: { total_count: 0 } }),
  ),

  // Congress.gov
  http.get("https://api.congress.gov/v3/*", () =>
    HttpResponse.json({}, { status: 404 }),
  ),

  // GovInfo
  http.get("https://www.govinfo.gov/*", () =>
    HttpResponse.text("", { status: 404 }),
  ),
  http.head("https://www.govinfo.gov/*", () =>
    HttpResponse.text("", { status: 404 }),
  ),

  // Google Civic
  http.get("https://www.googleapis.com/civicinfo/*", () =>
    HttpResponse.json({}, { status: 404 }),
  ),

  // Anthropic
  http.post("https://api.anthropic.com/v1/messages", () =>
    HttpResponse.json(
      {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-haiku-4-5-20251001",
        content: [{ type: "text", text: "stub summary" }],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 5 },
      },
      { status: 200 },
    ),
  ),

  // OpenAI
  http.post("https://api.openai.com/v1/chat/completions", () =>
    HttpResponse.json({
      id: "chatcmpl-test",
      object: "chat.completion",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "stub" },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
    }),
  ),

  // Resend (error-reporting.ts) — ensures reportError never leaks
  http.post("https://api.resend.com/emails", () =>
    HttpResponse.json({ id: "test" }),
  ),

  // Vercel AI Gateway — fails closed with a generic "gateway unavailable"
  // response so tests never pay for AI and the generate-change-summaries
  // path falls through to its AI-error branch deterministically.
  http.post("https://ai-gateway.vercel.sh/*", () =>
    HttpResponse.json({ error: "gateway disabled in tests" }, { status: 503 }),
  ),
  http.post("https://api.vercel.com/*", () =>
    HttpResponse.json(
      { error: "vercel api disabled in tests" },
      { status: 503 },
    ),
  ),
];
