"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Who should I call today?",
  "Summarise the pipeline",
  "Any overdue follow-ups?",
  "How is revenue tracking against target?",
];

export function AssistantChat({ brandLabel }: { brandLabel: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok || !data.reply) throw new Error(data.error || "Assistant request failed");
      setMessages((m) => [...m, { role: "assistant", content: data.reply! }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setMessages((m) => m.slice(0, -1));
      setInput(question);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[26rem] flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <Sparkles className="size-8 text-primary/60" />
            <div>
              <p className="font-medium">Type a question about {brandLabel}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Answers come from live CRM data — contacts, deals, follow-ups and finance.
              </p>
            </div>
            <div className="flex max-w-md flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-sm leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/60"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Checking the CRM…
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div ref={bottomRef} />
      </div>
      <form
        className="flex items-center gap-2 border-t p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about ${brandLabel}…`}
          disabled={busy}
          autoFocus
        />
        <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send">
          <SendHorizontal className="size-4" />
        </Button>
      </form>
    </div>
  );
}
