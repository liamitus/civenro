"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Maximize2, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import { AiPausedPanel } from "@/components/ai-paused-panel";
import {
  AiChatError,
  mapErrorToState,
  type AiChatErrorState,
} from "@/components/chat/ai-chat-error";
import type { ConversationMessage } from "@/types";

const MIN_WIDTH = 380;
const MAX_WIDTH_VW = 0.95;
const DEFAULT_WIDTH = 640;
const WIDTH_STORAGE_KEY = "govroll:ai-chat:width";

// Abort the chat request before Vercel's function timeout (60s on Hobby) so
// we surface a controlled error instead of a non-JSON platform error page.
const CHAT_TIMEOUT_MS = 58_000;

function AiMessageContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        blockquote: ({ children }) => (
          <blockquote className="border-civic-gold/60 text-muted-foreground my-2 border-l-2 pl-3 italic">
            {children}
          </blockquote>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="text-foreground font-semibold">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
        ),
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function AiChatbox({
  billId,
  onSignUp,
}: {
  billId: number;
  onSignUp?: () => void;
}) {
  const { user } = useAuth();
  const userId = user?.id;
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AiChatErrorState | null>(null);
  const [aiPaused, setAiPaused] = useState<{
    incomeCents: number;
    spendCents: number;
  } | null>(null);
  const [textTier, setTextTier] = useState<
    "full" | "summary" | "title-only" | null
  >(null);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_WIDTH;
    const stored = localStorage.getItem(WIDTH_STORAGE_KEY);
    if (!stored) return DEFAULT_WIDTH;
    const n = parseInt(stored, 10);
    return Number.isNaN(n) ? DEFAULT_WIDTH : clampWidth(n);
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const sheetInputRef = useRef<HTMLInputElement>(null);

  // Load existing conversation once per (billId, userId). Using `user?.id`
  // instead of the `user` object keeps this stable across Supabase token
  // refreshes, which otherwise re-fire the GET several times per session.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/ai/chat?billId=${billId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.messages) setMessages(data.messages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [billId, userId]);

  // Probe what AI context is actually available for this bill so we can
  // warn the user upfront if we only have a summary (or just the title).
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/bills/${billId}/ai-context`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.tier) return;
        setTextTier(d.tier);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [billId]);

  // Auto-scroll to bottom on new message, thinking state, or error
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, error]);

  // Focus input when sheet opens
  useEffect(() => {
    if (open) {
      // Wait for the sheet animation to finish before focusing
      const t = setTimeout(() => sheetInputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [open]);

  const sendMessage = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? input).trim();
      if (!text || !user || loading) return;

      setInput("");
      setError(null);
      setMessages((prev) => [
        ...prev,
        { sender: "user", text, createdAt: new Date().toISOString() },
      ]);
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId,
            userMessage: text,
            conversationId,
          }),
          signal: controller.signal,
        });

        // Read body as text first so we can handle non-JSON error pages
        // (e.g. Vercel's "An error occurred" 504 body) without throwing.
        const rawBody = await res.text();
        let data: unknown = null;
        let parseFailed = false;
        if (rawBody) {
          try {
            data = JSON.parse(rawBody);
          } catch {
            parseFailed = true;
          }
        }
        const parsed = (data ?? {}) as {
          conversationId?: string;
          aiAnswer?: string;
          error?: string;
          budget?: { incomeCents?: number; spendCents?: number };
        };

        if (res.ok && parsed.aiAnswer) {
          if (parsed.conversationId) setConversationId(parsed.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: parsed.aiAnswer as string,
              createdAt: new Date().toISOString(),
            },
          ]);
          return;
        }

        // AI budget exhausted — show the paused panel and drop the
        // optimistic user message since no response will ever arrive.
        if (res.status === 503 && parsed.error === "ai_disabled") {
          setAiPaused({
            incomeCents: parsed.budget?.incomeCents ?? 0,
            spendCents: parsed.budget?.spendCents ?? 0,
          });
          setMessages((prev) => prev.slice(0, -1));
          return;
        }

        setError(
          mapErrorToState({
            status: res.status,
            serverMessage: parsed.error,
            isParseError: parseFailed,
          }),
        );
      } catch (err) {
        const isAbort =
          err instanceof DOMException && err.name === "AbortError";
        setError(
          mapErrorToState({
            isAbort,
            isNetworkError: !isAbort,
          }),
        );
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [billId, conversationId, input, loading, user],
  );

  // Re-send the last user message without duplicating it in the thread.
  const retryLast = useCallback(() => {
    const last = messages[messages.length - 1];
    if (!last || last.sender !== "user") return;
    setError(null);
    setMessages((prev) => prev.slice(0, -1));
    void sendMessage(last.text);
  }, [messages, sendMessage]);

  // Submit from the inline trigger → opens sheet AND sends the message
  const submitFromTrigger = useCallback(() => {
    const text = input.trim();
    if (!text) {
      setOpen(true);
      return;
    }
    setOpen(true);
    void sendMessage(text);
  }, [input, sendMessage]);

  // Drag-to-resize the sheet
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const onResizeStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  const onResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startX - e.clientX;
    const next = clampWidth(dragRef.current.startWidth + delta);
    setWidth(next);
  };
  const onResizeEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    dragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    localStorage.setItem(WIDTH_STORAGE_KEY, String(width));
  };

  if (!user) {
    return (
      <div className="text-muted-foreground text-sm">
        <button
          type="button"
          onClick={onSignUp}
          className="hover:text-primary font-medium underline underline-offset-2 transition-colors"
        >
          Sign up
        </button>{" "}
        to ask questions about this bill.
      </div>
    );
  }

  const hasHistory = messages.length > 0;

  return (
    <>
      {/* ── Compact inline trigger ─────────────────────────────────────── */}
      {aiPaused && (
        <AiPausedPanel
          incomeCents={aiPaused.incomeCents}
          spendCents={aiPaused.spendCents}
        />
      )}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question…"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submitFromTrigger();
              }
            }}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setOpen(true)}
            aria-label="Open full chat"
            title="Open full chat"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={submitFromTrigger}
            disabled={!input.trim()}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {hasHistory && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
          >
            <MessageSquare className="h-3 w-3" />
            Continue conversation ({messages.length}{" "}
            {messages.length === 1 ? "message" : "messages"})
          </button>
        )}
      </div>

      {/* ── Slide-over sheet with full conversation ─────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent width={width}>
          {/* Resize handle pinned to the left edge */}
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat panel"
            onPointerDown={onResizeStart}
            onPointerMove={onResizeMove}
            onPointerUp={onResizeEnd}
            onPointerCancel={onResizeEnd}
            className="hover:bg-civic-gold/30 active:bg-civic-gold/60 absolute inset-y-0 left-0 z-20 w-1.5 cursor-col-resize transition-colors"
          />

          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <svg
                className="text-civic-gold h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              Ask AI About This Bill
            </SheetTitle>
            <SheetDescription>
              {textTier === "title-only"
                ? "Answers based on title and metadata only — full bill text isn't yet in our system."
                : textTier === "summary"
                  ? "Answers based on the nonpartisan CRS summary — full bill text isn't yet in our system."
                  : "Plain-language answers with direct quotes from the bill text."}
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable message area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
            {aiPaused ? (
              <div className="flex h-full items-center justify-center px-6">
                <AiPausedPanel
                  incomeCents={aiPaused.incomeCents}
                  spendCents={aiPaused.spendCents}
                />
              </div>
            ) : messages.length === 0 && !loading && !error ? (
              <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                <p className="text-foreground mb-1 text-sm font-medium">
                  Ask anything about this bill
                </p>
                <p className="text-muted-foreground max-w-sm text-xs">
                  Try{" "}
                  <button
                    type="button"
                    onClick={() =>
                      sendMessage("What does this bill actually do?")
                    }
                    className="hover:text-foreground underline"
                  >
                    What does this bill actually do?
                  </button>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={() => sendMessage("Who is most affected?")}
                    className="hover:text-foreground underline"
                  >
                    Who is most affected?
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`text-sm ${
                      msg.sender === "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-2.5 leading-relaxed ${
                        msg.sender === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {msg.sender === "ai" ? (
                        <AiMessageContent text={msg.text} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="flex justify-start"
                  >
                    <div className="bg-muted text-muted-foreground rounded-2xl px-4 py-2.5 text-sm">
                      <span className="sr-only">Assistant is thinking. </span>
                      <span aria-hidden="true">Thinking…</span>
                    </div>
                  </div>
                )}
                {error && !loading && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%]">
                      <AiChatError state={error} onRetry={retryLast} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input pinned to bottom */}
          <div className="bg-background border-t px-5 py-4">
            <div className="flex gap-2">
              <Input
                ref={sheetInputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask a question…"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                disabled={loading}
              />
              <Button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function clampWidth(n: number): number {
  const max =
    typeof window !== "undefined" ? window.innerWidth * MAX_WIDTH_VW : 1200;
  return Math.max(MIN_WIDTH, Math.min(max, n));
}
