"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/hooks/use-auth";
import type { ConversationMessage } from "@/types";

export function AiChatbox({ billId }: { billId: number }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load existing conversation
  useEffect(() => {
    if (!user) return;
    fetch(`/api/ai/chat?billId=${billId}&userId=${user.id}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.messages) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [billId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !user || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [
      ...prev,
      { sender: "user", text: userMessage, createdAt: new Date().toISOString() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          billId,
          userMessage,
          conversationId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversationId(data.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data.aiAnswer,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Chat error:", err);
    }

    setLoading(false);
  };

  if (!user) {
    return (
      <div className="text-sm text-muted-foreground">
        Sign in to ask questions about this bill.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm">Ask about this bill</h3>

      <ScrollArea className="h-64 rounded-md border p-3" ref={scrollRef}>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ask any question about this bill and get a clear, plain-language answer.
          </p>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`text-sm ${
                  msg.sender === "user"
                    ? "text-right"
                    : "text-left"
                }`}
              >
                <span
                  className={`inline-block max-w-[85%] rounded-lg px-3 py-2 ${
                    msg.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  {msg.text}
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-sm text-muted-foreground">
                Thinking...
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about this bill..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={loading}
        />
        <Button size="sm" onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
