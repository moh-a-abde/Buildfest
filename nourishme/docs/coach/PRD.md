# NourishMe Coach — Product Requirements Document

## Overview

NourishMe Coach is a Claude-powered conversational assistant that helps SNAP recipients and budget-conscious families learn nutrition basics, understand SNAP benefits, and make better food choices. It is **not** a medical advisor, caseworker replacement, or eligibility tool.

## User Jobs

| Job | Example Questions |
|-----|-------------------|
| Learn nutrition basics | "What is fiber and why does it matter?" |
| Understand SNAP rules | "Can I buy seeds with SNAP?" |
| Meal planning education | "How do I plan meals for a week on $50?" |
| Budget-friendly cooking | "What are cheap high-protein foods?" |
| Label reading | "How do I read a nutrition label?" |

## Persona and Tone

- **Name:** Coach (displayed as "NourishMe Coach")
- **Tone:** Friendly, non-judgmental, encouraging, concise
- **Voice:** Like a helpful neighbor who knows about nutrition and benefits — not a doctor, lawyer, or bureaucrat
- **Language level:** Plain English, avoid jargon, explain terms when used

## Supported Intents

1. General nutrition education (macronutrients, food groups, hydration, MyPlate)
2. SNAP eligibility and usage (what's covered, EBT basics, common misconceptions)
3. Budget meal planning tips (stretching dollars, batch cooking, seasonal produce)
4. Cooking skills (basic techniques, safe food handling, pantry-first recipes)
5. Reading and understanding food labels
6. Connecting to local resources (food banks, WIC, community programs)

## Hard Boundaries

- **No medical advice.** Never diagnose, prescribe diets for medical conditions, or override healthcare providers. Redirect: "That's a great question for your doctor or a registered dietitian."
- **No legal or eligibility determinations.** Never say "you qualify" or "you don't qualify." Redirect: "For official eligibility information, contact your state SNAP office or visit [benefits.gov](https://benefits.gov)."
- **No judgmental language.** Never shame food choices, spending, or lifestyle.
- **No hallucinated citations.** Only cite sources that were actually retrieved from the knowledge base.

## Entry Points

### 1. Floating Chat Dock (MVP)
- Persistent FAB button (bottom-right corner) across all authenticated pages
- Opens a slide-in panel from the right edge
- Compact chat interface with message history, input, and suggested prompts
- Collapsible — does not block page content when closed

### 2. Dedicated `/coach` Page (MVP)
- Full-page chat experience for longer, deeper conversations
- Centered layout with wider message area
- Same suggested prompts and interaction patterns as the dock
- Accessible via navigation and "Open full chat" link in the dock

### 3. Contextual "Ask Coach" CTAs (Post-MVP — Task 38)
- Small buttons on Plan day cards, Pantry page, Grocery List, and Resources pages
- Each CTA pre-fills the chat with a context-aware prompt (e.g., "How can I make this meal lower sodium?")
- Opens the dock with the pre-filled prompt

## Interaction Patterns

### Suggested Prompts
Displayed as tappable chips when the conversation is empty:
- "What can I buy with SNAP?"
- "How do I read a nutrition label?"
- "Give me a cheap high-protein meal idea"
- "How do I store food safely?"
- "What's the difference between whole grains and refined grains?"

### Context Toggles (Post-MVP)
Optional toggles that let the user share personal data with the Coach:
- **Use my pantry** — includes current pantry items in context
- **Use my budget** — includes SNAP balance and horizon
- **Use my profile** — includes dietary flags, household size, allergens

These are **off by default** and require explicit opt-in each session.

### Citation Cards (Post-MVP — requires RAG pipeline)
When the Coach makes factual claims backed by retrieved knowledge base chunks:
- Inline citation markers (e.g., [1], [2])
- Expandable citation card showing source title, URL, and a relevant quote
- Clickable link to original source

### Follow-Up Suggestions
After each response, the Coach may suggest 2-3 follow-up questions as tappable chips.

## Safety Disclaimers

Displayed persistently in the chat UI:
> "NourishMe Coach provides general nutrition and SNAP information. It is not medical advice and does not replace caseworkers or nutritionists. For specific dietary needs, consult a healthcare provider."

## MVP Scope (v1)

**Included:**
- Floating chat dock on all authenticated/guest pages
- Dedicated `/coach` page
- Streaming chat with Claude (no RAG — direct model responses)
- Suggested prompts
- Status indicators (loading, streaming, error)
- Rate limiting (20 messages/hour per user)
- Safety disclaimers and hard-boundary enforcement via system prompt
- Mobile-responsive layout

**Deferred to later tasks:**
- RAG retrieval from knowledge base (tasks 31-36)
- Citation cards and source attribution (task 35)
- Contextual "Ask Coach" CTAs (task 38)
- Context toggles (pantry/budget/profile injection)
- Eligibility prescreening workflows
- Guided lesson modules
- Conversation persistence and history
- Feedback collection (thumbs up/down) (task 41)

## Success Metrics

| Metric | Target |
|--------|--------|
| Chat engagement rate | > 15% of active users try Coach in first week |
| Messages per session | 3-5 average |
| Error rate | < 2% of requests |
| User satisfaction | > 70% positive (once feedback is added) |
| Safety compliance | 0 medical/legal determination responses |
