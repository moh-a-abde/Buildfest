"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
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

interface Citation {
  source_url: string;
  title: string;
  chunk_id: string;
  quote?: string;
}

interface ContextToggles {
  useProfile: boolean;
  usePantry: boolean;
  useBudget: boolean;
}

interface CoachChatProps {
  initialPrompt?: string;
  compact?: boolean;
}

function extractDataParts(parts: Array<{ type: string; data?: unknown }>) {
  let citations: Citation[] = [];
  let followUps: string[] = [];
  let safetyNotes: string[] = [];

  for (const part of parts) {
    if (part.type === "data-citations" && Array.isArray(part.data)) {
      citations = part.data as Citation[];
    } else if (part.type === "data-followUps" && Array.isArray(part.data)) {
      followUps = part.data as string[];
    } else if (part.type === "data-safetyNotes" && Array.isArray(part.data)) {
      safetyNotes = part.data as string[];
    }
  }

  return { citations, followUps, safetyNotes };
}

function extractTextFromParts(parts: Array<{ type: string; text?: string }>) {
  return parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text)
    .join("");
}

function CitationsList({
  citations,
  compact,
}: {
  citations: Citation[];
  compact?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const threshold = 3;
  const showToggle = citations.length >= threshold;
  const displayed = showToggle && !expanded ? citations.slice(0, 2) : citations;

  return (
    <div className="ml-10 max-w-[85%]">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        <span>
          Sources{" "}
          {citations.length > 2 && (
            <span className="text-muted-foreground/60">
              ({citations.length})
            </span>
          )}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayed.map((citation, i) => (
          <a
            key={i}
            href={citation.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-[11px] px-2 py-1 rounded-md border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
            title={citation.quote || citation.title}
          >
            <span className={cn("truncate", compact ? "max-w-[140px]" : "max-w-[180px]")}>
              {citation.title}
            </span>
          </a>
        ))}
      </div>
      {showToggle && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 inline-flex items-center text-[11px] text-primary/80 hover:text-primary transition-colors"
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer" : `View all ${citations.length} sources`}
        </button>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="opacity-0 group-hover/msg:opacity-100 transition-opacity px-2 py-1 rounded-md hover:bg-muted/80 text-muted-foreground hover:text-foreground text-[11px]"
      aria-label="Copy answer"
      title="Copy answer"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ContextToggleChip({
  active,
  onToggle,
  label,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-colors font-medium",
        active
          ? "bg-primary/10 text-primary border-primary/30"
          : "bg-background text-muted-foreground border-border hover:bg-muted/50",
      )}
    >
      {label}
    </button>
  );
}

export function CoachChat({ initialPrompt, compact = false }: CoachChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const lastInitialPromptRef = useRef<string | null>(null);
  const [contextToggles, setContextToggles] = useState<ContextToggles>({
    useProfile: false,
    usePantry: false,
    useBudget: false,
  });

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
    if (
      initialPrompt &&
      status === "ready" &&
      initialPrompt !== lastInitialPromptRef.current
    ) {
      lastInitialPromptRef.current = initialPrompt;
      sendMessage(
        { text: initialPrompt },
        { body: { contextToggles } },
      );
    }
  }, [initialPrompt, status, sendMessage, contextToggles]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage(
      { text: trimmed },
      { body: { contextToggles } },
    );
    setInput("");
  }

  function handlePromptClick(prompt: string) {
    if (isLoading) return;
    sendMessage(
      { text: prompt },
      { body: { contextToggles } },
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function toggleContext(key: keyof ContextToggles) {
    setContextToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className={cn("flex flex-col", compact ? "h-full" : "h-[600px]")}>
      {/* Disclaimer */}
      <div className="px-4 py-2 text-[11px] text-muted-foreground bg-muted/40 border-b leading-snug">
        <span>
          This is general information, not medical or legal advice. For official
          eligibility and rules, consult your state SNAP agency or visit{" "}
          <a href="https://benefits.gov" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">benefits.gov</a>.
        </span>
      </div>

      {/* Context toggles */}
      <div className="px-4 py-2 border-b flex flex-wrap gap-1.5" role="group" aria-label="Personal context toggles">
        <ContextToggleChip
          active={contextToggles.useProfile}
          onToggle={() => toggleContext("useProfile")}
          label="My profile"
        />
        <ContextToggleChip
          active={contextToggles.usePantry}
          onToggle={() => toggleContext("usePantry")}
          label="My pantry"
        />
        <ContextToggleChip
          active={contextToggles.useBudget}
          onToggle={() => toggleContext("useBudget")}
          label="My budget"
        />
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
        role="log"
        aria-label="Chat messages"
        aria-live="polite"
      >
        {!hasMessages && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
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

        {messages.map((message) => {
          const { citations, followUps, safetyNotes } =
            message.role === "assistant"
              ? extractDataParts(
                  message.parts as Array<{ type: string; data?: unknown }>,
                )
              : { citations: [], followUps: [], safetyNotes: [] };

          const assistantText =
            message.role === "assistant"
              ? extractTextFromParts(
                  message.parts as Array<{ type: string; text?: string }>,
                )
              : "";

          return (
            <div key={message.id} className="space-y-2">
              <div
                className={cn(
                  "flex gap-3 group/msg",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5 text-[10px] font-semibold">
                    AI
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

                {message.role === "assistant" && assistantText && (
                  <div className="flex flex-col justify-start pt-1">
                    <CopyButton text={assistantText} />
                  </div>
                )}

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center mt-0.5 text-[10px] font-semibold">
                    You
                  </div>
                )}
              </div>

              {/* Safety notes */}
              {message.role === "assistant" && safetyNotes.length > 0 && (
                <div className="ml-10 max-w-[85%]">
                  {safetyNotes.map((note, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 mt-1"
                    >
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Citations */}
              {message.role === "assistant" && citations.length > 0 && (
                <CitationsList citations={citations} compact={compact} />
              )}

              {/* Follow-up suggestions */}
              {message.role === "assistant" &&
                followUps.length > 0 &&
                !isLoading && (
                  <div className="ml-10 max-w-[85%] flex flex-wrap gap-1.5 mt-1">
                    {followUps.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handlePromptClick(q)}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
            </div>
          );
        })}

        {status === "submitted" && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5 text-[10px] font-semibold">
              AI
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
          <span className="flex-1 truncate">
            Something went wrong. Please try again.
          </span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => regenerate({ body: { contextToggles } })}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="border-t bg-background p-3">
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
            size="sm"
            disabled={!input.trim() || isLoading}
            className="rounded-xl h-[38px] px-3 flex-shrink-0"
            aria-label="Send"
          >
            Send
          </Button>
          {isLoading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => stop()}
              className="rounded-xl h-[38px] px-3 flex-shrink-0 text-muted-foreground"
            >
              Stop
            </Button>
          )}
        </form>
      </div>
    </div>
  );
}
