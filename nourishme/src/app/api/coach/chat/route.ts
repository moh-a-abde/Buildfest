import {
  streamText,
  Output,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod/v4";
import { model } from "@/app/ai/client";
import {
  CoachResponseSchema,
  buildCoachSystemPrompt,
  validateCitations,
  type CoachContextToggles,
  type UserContext,
} from "@/app/ai/coach";
import { retrieve, type RetrievedChunk } from "@/lib/rag/retrieve";
import { resolveUserId, getServiceClient } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

export const maxDuration = 60;

const COACH_MAX_MESSAGES_PER_HOUR = 20;
const MAX_CONVERSATION_MESSAGES = 20;

// ── Request validation ──

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system"]),
      content: z.string().optional(),
      parts: z.array(z.any()).optional(),
    }),
  ),
  contextToggles: z
    .object({
      useProfile: z.boolean().optional(),
      usePantry: z.boolean().optional(),
      useBudget: z.boolean().optional(),
    })
    .optional(),
});

// ── Glossary for the inline tool ──

const GLOSSARY: Record<string, string> = {
  snap: "Supplemental Nutrition Assistance Program — the federal food assistance program (formerly called food stamps) that provides monthly benefits on an EBT card to buy groceries.",
  ebt: "Electronic Benefits Transfer — the debit-like card used to spend SNAP and other food assistance benefits at authorized retailers.",
  myplate:
    "The USDA's visual guide showing how to build a balanced plate: half fruits and vegetables, a quarter grains, a quarter protein, plus a side of dairy.",
  macronutrients:
    "The three main nutrient categories your body needs in large amounts: carbohydrates (energy), protein (building/repair), and fat (energy storage, vitamin absorption).",
  fiber:
    "A type of carbohydrate from plant foods that your body cannot fully digest. Helps with digestion, fullness, and heart health. Daily goal: ~25g women, ~38g men.",
  "whole grains":
    "Grains that keep all three parts of the seed (bran, germ, endosperm). Examples: brown rice, oats, whole-wheat bread. More fiber and nutrients than refined grains.",
  "refined grains":
    "Grains that have been milled to remove the bran and germ for a finer texture but with less fiber and fewer nutrients. Examples: white bread, white rice.",
  "nutri-score":
    "A front-of-pack nutrition label rating food from A (best) to E (worst) based on its overall nutritional quality.",
  nova: "A food classification system grouping foods by degree of processing: 1 (unprocessed), 2 (processed culinary ingredients), 3 (processed foods), 4 (ultra-processed).",
};

// ── User context fetcher ──

async function fetchUserContext(
  userId: string,
  toggles: CoachContextToggles,
): Promise<{ userCtx: UserContext; jurisdiction?: string }> {
  const sb = getServiceClient();
  const userCtx: UserContext = {};
  let jurisdiction: string | undefined;

  const fetches: Array<Promise<void>> = [];

  if (toggles.useProfile) {
    fetches.push(
      (async () => {
        const { data } = await sb
          .from("profiles")
          .select("*")
          .eq("user_id", userId)
          .single();
        userCtx.profile = data;
        if (data?.zip_code) {
          jurisdiction = zipToState(data.zip_code) ?? undefined;
        }
      })(),
    );
  }

  if (toggles.usePantry) {
    fetches.push(
      (async () => {
        const { data } = await sb
          .from("pantry_items")
          .select("name, quantity, unit, expires_on")
          .eq("user_id", userId);
        userCtx.pantry = data;
      })(),
    );
  }

  if (toggles.useBudget) {
    fetches.push(
      (async () => {
        const { data } = await sb
          .from("budgets")
          .select("snap_remaining, horizon_days")
          .eq("user_id", userId)
          .single();
        userCtx.budget = data;
      })(),
    );
  }

  await Promise.all(fetches);
  return { userCtx, jurisdiction };
}

/**
 * Rough ZIP prefix → US state mapping for the most common ranges.
 * Returns two-letter state code or null.
 */
function zipToState(zip: string): string | null {
  const prefix = parseInt(zip.substring(0, 3), 10);
  if (isNaN(prefix)) return null;

  if (prefix >= 100 && prefix <= 149) return "NY";
  if (prefix >= 150 && prefix <= 196) return "PA";
  if (prefix >= 197 && prefix <= 199) return "DE";
  if (prefix >= 200 && prefix <= 205) return "DC";
  if (prefix >= 206 && prefix <= 219) return "MD";
  if (prefix >= 220 && prefix <= 246) return "VA";
  if (prefix >= 247 && prefix <= 268) return "WV";
  if (prefix >= 270 && prefix <= 289) return "NC";
  if (prefix >= 290 && prefix <= 299) return "SC";
  if (prefix >= 300 && prefix <= 319) return "GA";
  if (prefix >= 320 && prefix <= 349) return "FL";
  if (prefix >= 350 && prefix <= 369) return "AL";
  if (prefix >= 370 && prefix <= 385) return "TN";
  if (prefix >= 386 && prefix <= 397) return "MS";
  if (prefix >= 400 && prefix <= 427) return "KY";
  if (prefix >= 430 && prefix <= 459) return "OH";
  if (prefix >= 460 && prefix <= 479) return "IN";
  if (prefix >= 480 && prefix <= 499) return "MI";
  if (prefix >= 500 && prefix <= 528) return "IA";
  if (prefix >= 530 && prefix <= 549) return "WI";
  if (prefix >= 550 && prefix <= 567) return "MN";
  if (prefix >= 570 && prefix <= 577) return "SD";
  if (prefix >= 580 && prefix <= 588) return "ND";
  if (prefix >= 590 && prefix <= 599) return "MT";
  if (prefix >= 600 && prefix <= 629) return "IL";
  if (prefix >= 630 && prefix <= 658) return "MO";
  if (prefix >= 660 && prefix <= 679) return "KS";
  if (prefix >= 680 && prefix <= 693) return "NE";
  if (prefix >= 700 && prefix <= 714) return "LA";
  if (prefix >= 716 && prefix <= 729) return "AR";
  if (prefix >= 730 && prefix <= 749) return "OK";
  if (prefix >= 750 && prefix <= 799) return "TX";
  if (prefix >= 800 && prefix <= 816) return "CO";
  if (prefix >= 820 && prefix <= 831) return "WY";
  if (prefix >= 832 && prefix <= 838) return "ID";
  if (prefix >= 840 && prefix <= 847) return "UT";
  if (prefix >= 850 && prefix <= 865) return "AZ";
  if (prefix >= 870 && prefix <= 884) return "NM";
  if (prefix >= 889 && prefix <= 898) return "NV";
  if (prefix >= 900 && prefix <= 961) return "CA";
  if (prefix >= 967 && prefix <= 968) return "HI";
  if (prefix >= 970 && prefix <= 979) return "OR";
  if (prefix >= 980 && prefix <= 994) return "WA";
  if (prefix >= 995 && prefix <= 999) return "AK";

  return null;
}

// ── Tools ──

const storeInputSchema = z.object({
  zip: z.string().describe("5-digit ZIP code"),
});

const glossaryInputSchema = z.object({
  term: z.string().describe("The term to define (lowercase)"),
});

const stepsInputSchema = z.object({
  title: z.string().describe("Title for the step-by-step guide"),
  steps: z.array(z.string()).describe("Ordered list of steps"),
});

const coachTools = {
  lookupStores: tool({
    description:
      "Find SNAP-authorized stores near a ZIP code. Use when the user asks about where to shop or find stores.",
    inputSchema: storeInputSchema,
    execute: async ({ zip }: z.infer<typeof storeInputSchema>) => {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_SITE_URL ??
          process.env.VERCEL_URL ??
          "http://localhost:3000";
        const res = await fetch(
          `${baseUrl}/api/stores?zip=${encodeURIComponent(zip)}`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!res.ok) return { error: "Store lookup failed", stores: [] };
        const data = await res.json();
        const stores = (data.stores ?? []).slice(0, 5);
        return {
          stores: stores.map(
            (s: { name: string; address: string; storeType: string; healthyIncentives: boolean }) => ({
              name: s.name,
              address: s.address,
              type: s.storeType,
              healthyIncentives: s.healthyIncentives,
            }),
          ),
        };
      } catch {
        return { error: "Store lookup unavailable", stores: [] };
      }
    },
  }),

  defineGlossaryTerm: tool({
    description:
      "Look up a nutrition or SNAP term definition. Use when the user asks 'what is...' or 'what does ... mean'.",
    inputSchema: glossaryInputSchema,
    execute: async ({ term }: z.infer<typeof glossaryInputSchema>) => {
      const key = term.toLowerCase().trim();
      const definition = GLOSSARY[key];
      if (definition) return { term: key, definition };
      return {
        term: key,
        definition: null,
        hint: "Term not in glossary. Answer from your knowledge or retrieved sources.",
      };
    },
  }),

  formatAsSteps: tool({
    description:
      'Format content as numbered steps. Use when the user asks "show me steps" or "how do I..." for a procedure.',
    inputSchema: stepsInputSchema,
    execute: async ({ title, steps }: z.infer<typeof stepsInputSchema>) => {
      const formatted = steps
        .map((step, i) => `${i + 1}. ${step}`)
        .join("\n");
      return { title, formatted, stepCount: steps.length };
    },
  }),
};

// ── Extract last user message text ──

function extractLastUserQuery(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;

    if (msg.parts) {
      const textParts = msg.parts
        .filter((p): p is { type: "text"; text: string } => p.type === "text")
        .map((p) => p.text);
      if (textParts.length > 0) return textParts.join(" ");
    }
  }
  return "";
}

// ── POST handler ──

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  const userId = await resolveUserId();
  if (!userId) {
    return new Response(
      JSON.stringify({
        error: "Authentication required. Sign in or use guest mode.",
      }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  const rateCheck = checkRateLimit(userId, COACH_MAX_MESSAGES_PER_HOUR);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "You've reached the message limit. Try again later.",
        resetAt: new Date(rateCheck.resetAt).toISOString(),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(
            Math.ceil((rateCheck.resetAt - Date.now()) / 1000),
          ),
        },
      },
    );
  }

  let body: z.infer<typeof ChatRequestSchema>;
  try {
    const raw = await req.json();
    body = ChatRequestSchema.parse(raw);
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request format" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const toggles: CoachContextToggles = body.contextToggles ?? {};
  const messages = body.messages.slice(
    -MAX_CONVERSATION_MESSAGES,
  ) as UIMessage[];

  const userQuery = extractLastUserQuery(messages);
  if (!userQuery) {
    return new Response(
      JSON.stringify({ error: "No user message found" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Fetch user context + retrieval in parallel
  const [contextResult, retrievalResult] = await Promise.all([
    fetchUserContext(userId, toggles),
    retrieve({
      query: userQuery,
      topK: 5,
      maxTokens: 3000,
      jurisdiction:
        toggles.useProfile ? undefined : undefined,
    }).catch((err) => {
      console.error(`[coach:${requestId}] retrieval error:`, err);
      return null;
    }),
  ]);

  const { userCtx, jurisdiction } = contextResult;
  let chunks: RetrievedChunk[] = [];

  if (retrievalResult) {
    chunks = retrievalResult.chunks;

    // Re-run with jurisdiction if we got one from profile
    if (jurisdiction && chunks.length === 0) {
      try {
        const retryResult = await retrieve({
          query: userQuery,
          topK: 5,
          maxTokens: 3000,
          jurisdiction,
        });
        chunks = retryResult.chunks;
      } catch {
        // use empty chunks
      }
    }
  }

  const systemPrompt = buildCoachSystemPrompt(chunks, toggles, userCtx);

  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const result = streamText({
        model,
        system: systemPrompt,
        messages: await convertToModelMessages(messages),
        tools: coachTools,
        output: Output.object({
          schema: CoachResponseSchema,
        }),
        stopWhen: stepCountIs(3),
      });

      const textId = generateId();
      writer.write({ type: "text-start", id: textId });

      let previousAnswer = "";

      for await (const partial of result.partialOutputStream) {
        if (partial?.answer && partial.answer !== previousAnswer) {
          const delta = partial.answer.slice(previousAnswer.length);
          if (delta) {
            writer.write({ type: "text-delta", id: textId, delta });
          }
          previousAnswer = partial.answer;
        }
      }

      writer.write({ type: "text-end", id: textId });

      // Get the final validated output
      const output = await result.output;
      if (output) {
        const validatedCitations = validateCitations(
          output.citations ?? [],
          chunks,
        );

        if (validatedCitations.length > 0) {
          writer.write({
            type: "data-citations" as `data-${string}`,
            id: generateId(),
            data: validatedCitations,
          });
        }

        if (output.follow_ups && output.follow_ups.length > 0) {
          writer.write({
            type: "data-followUps" as `data-${string}`,
            id: generateId(),
            data: output.follow_ups,
          });
        }

        if (output.safety_notes && output.safety_notes.length > 0) {
          writer.write({
            type: "data-safetyNotes" as `data-${string}`,
            id: generateId(),
            data: output.safety_notes,
          });
        }
      }

      const latency = Date.now() - startTime;
      console.log(
        `[coach:${requestId}] latency=${latency}ms chunks=${chunks.length} citations=${output?.citations?.length ?? 0}`,
      );
    },
    onError: () => "An error occurred while generating the response.",
  });

  return createUIMessageStreamResponse({ stream });
}
