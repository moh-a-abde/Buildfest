/**
 * RAG Answer Composer for NourishMe Coach.
 *
 * Takes conversation messages, user context toggles, and retrieved KB chunks,
 * then generates a structured JSON response with citations grounded in the
 * retrieved content. Citations are post-validated to prevent hallucination.
 */

import { z } from "zod/v4";
import type { RetrievedChunk } from "@/lib/rag/retrieve";

// ── Zod Schemas ──

export const CitationSchema = z.object({
  source_url: z.string().describe("URL of the source document"),
  title: z.string().describe("Title of the source document"),
  chunk_id: z.string().uuid().describe("ID of the retrieved chunk this cites"),
  quote: z
    .string()
    .optional()
    .describe("Short direct quote from the chunk, if applicable"),
});

export const CoachResponseSchema = z.object({
  answer: z
    .string()
    .describe(
      "The coach's response in markdown. Friendly, concise, 2-4 short paragraphs.",
    ),
  citations: z
    .array(CitationSchema)
    .describe(
      "Citations grounding factual claims. Each must reference a retrieved chunk.",
    ),
  follow_ups: z
    .array(z.string())
    .describe("2-3 suggested follow-up questions the user might ask next"),
  safety_notes: z
    .array(z.string())
    .optional()
    .describe(
      "Safety disclaimers when the answer touches medical, legal, or eligibility topics",
    ),
});

export type CoachResponse = z.infer<typeof CoachResponseSchema>;
export type Citation = z.infer<typeof CitationSchema>;

// ── Input types ──

export interface CoachContextToggles {
  useProfile?: boolean;
  usePantry?: boolean;
  useBudget?: boolean;
}

export interface UserContext {
  profile?: {
    household_size?: number;
    zip_code?: string;
    dietary_flags?: string[];
    cooking_time_level?: string;
  } | null;
  pantry?: Array<{
    name: string;
    quantity: number;
    unit: string;
    expires_on?: string | null;
  }> | null;
  budget?: {
    snap_remaining?: number;
    horizon_days?: number;
  } | null;
}

// ── System prompt builder ──

function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "No relevant knowledge base articles found.";

  return chunks
    .map(
      (c, i) =>
        `[SOURCE ${i + 1}]
chunk_id: ${c.chunkId}
title: ${c.title}
topic: ${c.topic}
jurisdiction: ${c.jurisdiction}
source_url: ${c.sourceUrl ?? "N/A"}
---
${c.content}
---`,
    )
    .join("\n\n");
}

function formatUserContext(
  toggles: CoachContextToggles,
  ctx?: UserContext,
): string {
  if (!ctx) return "";

  const sections: string[] = [];

  if (toggles.useProfile && ctx.profile) {
    const p = ctx.profile;
    const flags =
      p.dietary_flags && p.dietary_flags.length > 0
        ? p.dietary_flags.join(", ")
        : "none";
    sections.push(
      `## User Profile
- Household size: ${p.household_size ?? "unknown"}
- ZIP code: ${p.zip_code ?? "unknown"}
- Dietary flags: ${flags}
- Cooking time preference: ${p.cooking_time_level ?? "unknown"}`,
    );
  }

  if (toggles.usePantry && ctx.pantry && ctx.pantry.length > 0) {
    const items = ctx.pantry
      .map(
        (i) =>
          `- ${i.name}: ${i.quantity} ${i.unit}${i.expires_on ? ` (expires ${i.expires_on})` : ""}`,
      )
      .join("\n");
    sections.push(`## Current Pantry\n${items}`);
  }

  if (toggles.useBudget && ctx.budget) {
    sections.push(
      `## Budget
- SNAP remaining: $${ctx.budget.snap_remaining?.toFixed(2) ?? "unknown"}
- Horizon: ${ctx.budget.horizon_days ?? "unknown"} days`,
    );
  }

  return sections.length > 0 ? "\n" + sections.join("\n\n") + "\n" : "";
}

export function buildCoachSystemPrompt(
  chunks: RetrievedChunk[],
  toggles: CoachContextToggles,
  userContext?: UserContext,
  hasLocation?: boolean,
): string {
  const sourcesBlock = formatChunksForPrompt(chunks);
  const contextBlock = formatUserContext(toggles, userContext);

  const locationBlock = hasLocation
    ? `## Location and State-Specific Guidance
- The user's ZIP code / state is available in the User Profile above.
- You may reference state-specific sources if they appear in RETRIEVED SOURCES below; otherwise stick to US-wide guidance.
- Always note when guidance is state-specific vs. general (US-wide).`
    : `## Location and State-Specific Guidance
- The user has NOT shared a ZIP code or state.
- When the user asks about state-specific SNAP rules (recertification timelines, reporting requirements, benefit amounts, application processes, etc.), do NOT give state-specific guidance.
- Instead: provide general US-wide information from the retrieved sources, cite appropriately, and add a safety_note: "SNAP rules vary by state. For state-specific details, I'd need your ZIP code or state — you can add it in your profile settings. You can also contact your state SNAP office or visit benefits.gov."
- When you DO have the user's location, you may reference state-specific sources.`;

  return `You are NourishMe Coach, a friendly and supportive nutrition education assistant for SNAP (food stamp) recipients and budget-conscious families.

## Your Role
- Help users learn about nutrition basics (macronutrients, food groups, MyPlate, fiber, protein)
- Answer questions about SNAP benefits (what's covered, EBT usage, common misconceptions)
- Share budget-friendly meal planning tips (stretching dollars, batch cooking, seasonal produce)
- Teach basic cooking skills (safe food handling, pantry-first cooking, reading nutrition labels)
- Connect users to helpful resources when appropriate

## Your Personality
- Friendly and encouraging, like a helpful neighbor
- Non-judgmental about food choices, spending, or lifestyle
- Use plain English, avoid jargon, explain terms when you use them
- Keep answers concise and practical (2-4 short paragraphs max)
- Use bullet points and numbered lists for actionable advice

## Hard Boundaries — NEVER do these:
- NEVER provide medical advice, diagnose conditions, or prescribe diets for medical conditions. Instead add a safety_note: "That's a great question for your doctor or a registered dietitian."
- NEVER make legal or eligibility determinations about SNAP or any benefits program. Instead add a safety_note: "For official eligibility information, contact your state SNAP office or visit benefits.gov."
- NEVER use judgmental, shaming, or condescending language about food choices or financial situations.
- NEVER invent statistics, studies, or specific numbers you aren't confident about. Say "I'm not sure of the exact figure" instead.
- NEVER fabricate citations. Only cite chunks that appear in RETRIEVED SOURCES below.

${locationBlock}

## Citation Rules
- When making a factual claim about nutrition, SNAP policy, or cooking guidance, you MUST cite the relevant source chunk.
- Each citation must include the chunk_id from the retrieved sources. Do NOT invent chunk_ids.
- If the knowledge base lacks information to answer a question, say so honestly and suggest the user check official sources. Do NOT make up an answer.
- Distinguish between general (US-wide) guidance and state-specific rules. If a source has jurisdiction other than "US", note the state it applies to.
- Include a short quote from the source when it strengthens the citation.

## Formatting
- Use markdown for the answer: **bold** for emphasis, bullet points for lists
- Keep responses focused and under 300 words when possible
- End with a practical next step or offer to go deeper on a topic
- Suggest 2-3 follow-up questions the user might want to ask next
${contextBlock}
## Retrieved Sources
${sourcesBlock}

## Response Format
Respond with a JSON object containing: answer, citations, follow_ups, and optionally safety_notes. Every citation chunk_id must match one of the retrieved source chunk_ids above.`;
}

// ── Post-validation ──

/**
 * Filter citations so only those referencing actual retrieved chunk_ids remain.
 * Prevents hallucinated citations from reaching the user.
 */
export function validateCitations(
  citations: Citation[],
  chunks: RetrievedChunk[],
): Citation[] {
  const validIds = new Set(chunks.map((c) => c.chunkId));
  return citations.filter((c) => validIds.has(c.chunk_id));
}
