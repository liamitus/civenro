import { NextRequest, NextResponse } from "next/server";
import { reportError } from "@/lib/error-reporting";

/**
 * POST /api/errors/report
 *
 * Receives client-side error reports from the global error boundary
 * and forwards them through the email alerting pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, digest } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const error = new Error(message);
    error.stack = typeof stack === "string" ? stack : undefined;

    await reportError(error, {
      source: "client",
      digest: typeof digest === "string" ? digest : undefined,
      url: request.headers.get("referer") || undefined,
      ua: request.headers.get("user-agent") || undefined,
    });
  } catch {
    // Silently swallow — error reporting should never fail loudly
  }

  return NextResponse.json({ ok: true });
}
