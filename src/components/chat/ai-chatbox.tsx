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
import type { ConversationMessage } from "@/types";

const MIN_WIDTH = 380;
const MAX_WIDTH_VW = 0.95;
const DEFAULT_WIDTH = 640;
const WIDTH_STORAGE_KEY = "govroll:ai-chat:width";

function AiMessageContent({ text }: { text: string }) {
  return (
    <ReactMarkdown
      components={{
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-civic-gold/60 pl-3 my-2 text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

export function AiChatbox({ billId }: { billId: number }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiPaused, setAiPaused] = useState<{
    incomeCents: number;
    spendCents: number;
  } | null>(null);
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

  // Load existing conversation once on mount.
  // (Loading on `open` would race with optimistic user-message updates and
  // overwrite local state mid-send.)
  useEffect(() => {
    if (!user) return;
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
  }, [billId, user]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

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
      setMessages((prev) => [
        ...prev,
        { sender: "user", text, createdAt: new Date().toISOString() },
      ]);
      setLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            billId,
            userMessage: text,
            conversationId,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setConversationId(data.conversationId);
          setMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: data.aiAnswer,
              createdAt: new Date().toISOString(),
            },
          ]);
        } else if (res.status === 503 && data.error === "ai_disabled") {
          // AI budget exhausted — show paused panel
          setAiPaused({
            incomeCents: data.budget?.incomeCents ?? 0,
            spendCents: data.budget?.spendCents ?? 0,
          });
          // Remove the optimistic user message since AI couldn't respond
          setMessages((prev) => prev.slice(0, -1));
        }
      } catch (err) {
        console.error("Chat error:", err);
      }

      setLoading(false);
    },
    [billId, conversationId, input, loading, user],
  );

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
      <div className="text-sm text-muted-foreground">
        Sign in to ask questions about this bill.
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
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            className="absolute inset-y-0 left-0 z-20 w-1.5 cursor-col-resize hover:bg-civic-gold/30 active:bg-civic-gold/60 transition-colors"
          />

          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-civic-gold"
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
              Plain-language answers with direct quotes from the bill text.
            </SheetDescription>
          </SheetHeader>

          {/* Scrollable message area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-5 py-5"
          >
            {aiPaused ? (
              <div className="flex h-full items-center justify-center px-6">
                <AiPausedPanel
                  incomeCents={aiPaused.incomeCents}
                  spendCents={aiPaused.spendCents}
                />
              </div>
            ) : messages.length === 0 && !loading ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-6">
                <p className="text-sm font-medium text-foreground mb-1">
                  Ask anything about this bill
                </p>
                <p className="text-xs text-muted-foreground max-w-sm">
                  Try{" "}
                  <button
                    type="button"
                    onClick={() => sendMessage("What does this bill actually do?")}
                    className="underline hover:text-foreground"
                  >
                    What does this bill actually do?
                  </button>{" "}
                  or{" "}
                  <button
                    type="button"
                    onClick={() => sendMessage("Who is most affected?")}
                    className="underline hover:text-foreground"
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
                      msg.sender === "user" ? "flex justify-end" : "flex justify-start"
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
                  <div className="flex justify-start">
                    <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                      Thinking…
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input pinned to bottom */}
          <div className="border-t bg-background px-5 py-4">
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
  const max = typeof window !== "undefined" ? window.innerWidth * MAX_WIDTH_VW : 1200;
  return Math.max(MIN_WIDTH, Math.min(max, n));
}
