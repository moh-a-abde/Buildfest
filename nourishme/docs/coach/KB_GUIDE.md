# NourishMe Coach — Knowledge Base Editorial Guide

This document defines the rules, structure, and standards for all content in the `/kb` knowledge base. The KB is the source of truth for the NourishMe Coach RAG pipeline: every factual claim the Coach makes should be grounded in a KB document.

## Directory Structure

```
kb/
├── nutrition/        # MyPlate, macronutrients, fiber, label reading, food groups
├── snap/             # SNAP/EBT basics, eligible/ineligible items, reporting, recertification
├── cooking-skills/   # Safe handling, batch cooking, pantry-first techniques
└── budgeting/        # Stretching dollars, seasonal shopping, meal planning on a budget
```

Each subfolder corresponds to a `topic` value in the frontmatter.

## Allowed Sources

KB documents must be based on information from **trusted, non-commercial, public-interest sources**:

| Category | Examples |
|----------|----------|
| Federal agencies | USDA, FNS (fns.usda.gov), FDA, CDC, NIH |
| Official guidance | MyPlate.gov, DietaryGuidelines.gov, benefits.gov |
| State agencies | State SNAP/EBT portals (e.g., access.nyc.gov, calfresh.ca.gov) |
| Public health orgs | Academy of Nutrition and Dietetics (eatright.org), WHO |
| Extension services | USDA Cooperative Extension, university extension programs |

**Not allowed:** commercial diet/food blogs, social media posts, sponsored content, advertising-supported "health" sites, unverified Wikipedia claims.

## Required Frontmatter

Every KB markdown file **must** begin with YAML frontmatter containing all of these fields:

```yaml
---
title: "Human-Readable Document Title"
topic: nutrition          # One of: nutrition, snap, cooking-skills, budgeting
jurisdiction: US          # "US" for federal/general; two-letter state code for state-specific
audience: general         # e.g., general, beginners, families, seniors
last_reviewed_at: "2025-02-21"  # ISO 8601 date (YYYY-MM-DD)
source_url: "https://www.myplate.gov/eat-healthy/what-is-myplate"
---
```

### Field Rules

- **title** — Short, descriptive. Must be unique across the entire KB.
- **topic** — Must match the parent folder name exactly.
- **jurisdiction** — Use `US` for content that applies nationwide. Use a two-letter state code (e.g., `CA`, `NY`, `TX`) only for state-specific rules. If content mixes federal and state info, use the most specific jurisdiction and note federal vs. state scope in the body.
- **audience** — Target reader. Common values: `general`, `beginners`, `families`, `seniors`. Multiple values are comma-separated: `beginners, families`.
- **last_reviewed_at** — Date the content was last verified against the source. Must be updated whenever the document is edited.
- **source_url** — Canonical URL of the primary source. If multiple sources are used, list the primary one here and cite others inline.

## Content Standards

### Length and Tone

- Each document should be **1–3 focused paragraphs** (roughly 150–600 words). These are curated summaries, not full reprints of source material.
- Write in **plain English** at a 6th–8th grade reading level. Explain terms when first used.
- Use a **friendly, non-judgmental** tone consistent with the Coach persona.

### Chunking Expectations

The ingestion pipeline (task 33) will split documents into chunks of approximately **500–900 tokens** with overlap for context continuity. To make chunking predictable:

- Use `##` headings to create natural chunk boundaries.
- Keep paragraphs self-contained — a paragraph should make sense without the one before it.
- Avoid very long bullet lists that span hundreds of words; break them into sections instead.

### Citations and Disclaimers

- When stating facts about SNAP policy, include inline references to the source: *"According to USDA FNS, SNAP benefits can be used to buy..."*
- For health-related claims, include: *"For personalized dietary advice, consult a healthcare provider or registered dietitian."*
- For eligibility-adjacent content, include: *"For official eligibility information, contact your state SNAP office or visit benefits.gov."*
- Never make definitive eligibility determinations (e.g., "you qualify" or "you are eligible").

### What Not to Write

- Medical or dietary prescriptions ("you should eat X for your condition")
- Legal advice or eligibility determinations
- Content copied verbatim from sources (paraphrase and cite)
- Content from non-allowed sources
- Judgmental language about food choices, income, or lifestyle

## Adding New Documents

1. Pick the correct topic folder (`nutrition/`, `snap/`, `cooking-skills/`, `budgeting/`).
2. Name the file with kebab-case: `topic-name.md` (e.g., `reading-nutrition-labels.md`).
3. Add complete frontmatter with all required fields.
4. Write 1–3 paragraphs of curated, factual content.
5. Include at least one inline citation to the `source_url`.
6. Add disclaimers where appropriate (medical, eligibility).
7. Set `last_reviewed_at` to today's date.
8. Run the validation check (see below) before merging.

## Validation Checklist

Before any KB document is accepted:

- [ ] All six frontmatter fields are present and non-empty
- [ ] `topic` matches the parent folder name
- [ ] `jurisdiction` is `US` or a valid two-letter state code
- [ ] `source_url` is from an allowed source domain
- [ ] `last_reviewed_at` is a valid ISO 8601 date
- [ ] Content is 1–3 paragraphs, plain English, non-judgmental
- [ ] Inline citation references the source
- [ ] Medical/eligibility disclaimers are present where needed
- [ ] No verbatim copying from sources
- [ ] No medical, legal, or eligibility determinations
