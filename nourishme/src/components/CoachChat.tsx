"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  AlertTriangle,
  ArrowUp,
  Leaf,
  Loader2,
  RotateCcw,
  Square,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "What can I buy with SNAP?",
  "How do I read a nutrition label?",
  "Give me a cheap high-protein meal idea",
  "How do I store food safely?",
  "What are whole grains vs refined grains?",
];

const transport = new DefaultChatTransport({
  api: "/api/coach/chat",
});

interface CoachChatProps {
  initialPrompt?: string;
  compact?: boolean;
}

export function CoachChat({ initialPrompt, compact = false }: CoachChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const sentInitialRef = useRef(false);

  const {
    messages,
    sendMessage,
    status,
    stop,
    error,
    regenerate,
  } = useChat({ transport });

  const isLoading = status === "submitted" || status === "streaming";
  const hasMessages = messages.length > 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialPrompt && !sentInitialRef.current && status === "ready") {
      sentInitialRef.current = true;
      sendMessage({ text: initialPrompt });
    }
  }, [initialPrompt, status, sendMessage]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
  }

  function handlePromptClick(prompt: string) {
    if (isLoading) return;
    sendMessage({ text: prompt });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className={cn("flex flex-col", compact ? "h-full" : "h-[600px]")}>
      {/* Disclaimer */}
      <div className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/40 border-b leading-snug">
        NourishMe Coach provides general nutrition and SNAP information. It is not
        medical advice and does not replace caseworkers or nutritionists.
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
      >
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="bg-primary/10 text-primary rounded-full p-4">
              <Leaf className="w-8 h-8" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg mb-1">
                NourishMe Coach
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs">
                Ask about nutrition, SNAP benefits, meal planning, or
                budget-friendly cooking tips.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handlePromptClick(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "assistant" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
                <Leaf className="w-4 h-4" />
              </div>
            )}

            <div
              className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed max-w-[85%] whitespace-pre-wrap",
                message.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-muted/60 text-foreground rounded-bl-md",
              )}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <span key={i}>{part.text}</span>
                ) : null,
              )}
            </div>

            {message.role === "user" && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5">
              <Leaf className="w-4 h-4" />
            </div>
            <div className="bg-muted/60 rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm bg-destructive/10 text-destructive border-t">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 truncate">Something went wrong. Please try again.</span>
          <Button variant="ghost" size="xs" onClick={() => regenerate()}>
            <RotateCcw className="w-3 h-3" />
            Retry
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background p-3">
        {isLoading && (
          <div className="flex justify-center mb-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => stop()}
              className="text-muted-foreground"
            >
              <Square className="w-3 h-3" />
              Stop generating
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            placeholder="Ask about nutrition, SNAP, or cooking..."
            rows={1}
            className={cn(
              "flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "min-h-[38px] max-h-[120px]",
            )}
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="rounded-xl h-[38px] w-[38px] flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
