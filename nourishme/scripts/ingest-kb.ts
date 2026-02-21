/**
 * KB Ingestion Pipeline — reads markdown files from kb/, parses frontmatter,
 * chunks content, and upserts into Supabase (kb_documents, kb_chunks, kb_embeddings).
 *
 * Usage:
 *   npx tsx scripts/ingest-kb.ts            # full ingestion
 *   npx tsx scripts/ingest-kb.ts --dry-run  # parse + chunk only, no DB writes
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
 * Embedding provider is controlled by EMBEDDING_PROVIDER env var (local | openai).
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, relative, join } from "path";
import matter from "gray-matter";
import { embed, embeddingModel } from "../src/lib/embeddings";

// ── Config ──

const CHUNK_TARGET_TOKENS = 700;
const CHUNK_MIN_TOKENS = 200;
const CHUNK_MAX_TOKENS = 900;
const CHUNK_OVERLAP_TOKENS = 100;
const CHARS_PER_TOKEN = 4;

const KB_DIR = resolve(__dirname, "..", "kb");
const DRY_RUN = process.argv.includes("--dry-run");

// ── Env ──

function loadEnv() {
  const envPath = resolve(__dirname, "..", ".env.local");
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx);
      const val = trimmed.slice(eqIdx + 1);
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // .env.local may not exist in CI
  }
}

loadEnv();

// ── Helpers ──

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function globMarkdown(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...globMarkdown(full));
    } else if (entry.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

interface KBFrontmatter {
  title: string;
  topic: string;
  jurisdiction: string;
  audience?: string;
  last_reviewed_at: string;
  source_url: string;
}

interface KBDocument {
  frontmatter: KBFrontmatter;
  body: string;
  filePath: string;
}

interface KBChunk {
  index: number;
  content: string;
  tokenCount: number;
}

function parseDocument(filePath: string): KBDocument | null {
  const raw = readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const fm = data as Partial<KBFrontmatter>;
  if (!fm.title || !fm.topic || !fm.source_url) {
    console.warn(`  SKIP ${relative(KB_DIR, filePath)}: missing required frontmatter fields`);
    return null;
  }

  const body = content
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    frontmatter: {
      title: fm.title,
      topic: fm.topic,
      jurisdiction: fm.jurisdiction ?? "US",
      audience: fm.audience,
      last_reviewed_at: fm.last_reviewed_at ?? new Date().toISOString().slice(0, 10),
      source_url: fm.source_url,
    },
    body,
    filePath,
  };
}

/**
 * Chunk document body into ~500-900 token chunks with overlap.
 * Splits on ## headings first, then falls back to paragraph boundaries.
 */
function chunkDocument(body: string): KBChunk[] {
  const sections = body.split(/(?=^## )/m).filter((s) => s.trim().length > 0);

  const rawChunks: string[] = [];

  for (const section of sections) {
    const sectionTokens = estimateTokens(section);

    if (sectionTokens <= CHUNK_MAX_TOKENS) {
      rawChunks.push(section.trim());
    } else {
      const paragraphs = section.split(/\n\n+/).filter((p) => p.trim().length > 0);
      let current = "";

      for (const para of paragraphs) {
        const combined = current ? `${current}\n\n${para}` : para;
        if (estimateTokens(combined) > CHUNK_MAX_TOKENS && current) {
          rawChunks.push(current.trim());
          current = para;
        } else {
          current = combined;
        }
      }
      if (current.trim()) rawChunks.push(current.trim());
    }
  }

  // Merge small trailing chunks into previous
  const merged: string[] = [];
  for (const chunk of rawChunks) {
    if (merged.length > 0 && estimateTokens(chunk) < CHUNK_MIN_TOKENS) {
      const prev = merged[merged.length - 1];
      if (estimateTokens(prev) + estimateTokens(chunk) <= CHUNK_MAX_TOKENS) {
        merged[merged.length - 1] = `${prev}\n\n${chunk}`;
        continue;
      }
    }
    merged.push(chunk);
  }

  // Add overlap from the end of the previous chunk to the start of the next
  const chunks: KBChunk[] = [];
  for (let i = 0; i < merged.length; i++) {
    let content = merged[i];

    if (i > 0) {
      const prevText = merged[i - 1];
      const overlapChars = CHUNK_OVERLAP_TOKENS * CHARS_PER_TOKEN;
      if (prevText.length > overlapChars) {
        const overlapText = prevText.slice(-overlapChars).trim();
        const firstSentence = overlapText.indexOf(". ");
        const cleanOverlap =
          firstSentence > 0 ? overlapText.slice(firstSentence + 2) : overlapText;
        if (cleanOverlap.length > 20) {
          content = `${cleanOverlap}\n\n${content}`;
        }
      }
    }

    chunks.push({
      index: i,
      content,
      tokenCount: estimateTokens(content),
    });
  }

  return chunks;
}

// ── Main ──

async function main() {
  console.log(`KB Ingestion Pipeline${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`Embedding provider: ${embeddingModel()}\n`);

  const files = globMarkdown(KB_DIR);
  if (files.length === 0) {
    console.error(`No .md files found in ${KB_DIR}`);
    process.exit(1);
  }
  console.log(`Found ${files.length} KB file(s)\n`);

  const documents: { doc: KBDocument; chunks: KBChunk[] }[] = [];

  for (const filePath of files) {
    const doc = parseDocument(filePath);
    if (!doc) continue;

    const chunks = chunkDocument(doc.body);
    documents.push({ doc, chunks });

    const rel = relative(KB_DIR, filePath);
    console.log(`  ${rel}: ${chunks.length} chunk(s), ~${chunks.reduce((s, c) => s + c.tokenCount, 0)} tokens`);
  }

  console.log(`\nParsed ${documents.length} document(s), ${documents.reduce((s, d) => s + d.chunks.length, 0)} total chunk(s)`);

  if (DRY_RUN) {
    console.log("\n── Dry Run Summary ──");
    for (const { doc, chunks } of documents) {
      console.log(`\n  "${doc.frontmatter.title}" (${doc.frontmatter.topic}/${doc.frontmatter.jurisdiction})`);
      for (const chunk of chunks) {
        console.log(`    chunk[${chunk.index}]: ${chunk.tokenCount} tokens — ${chunk.content.slice(0, 80).replace(/\n/g, " ")}...`);
      }
    }
    console.log("\nDry run complete. No DB writes.");
    return;
  }

  // ── DB Setup ──

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  let docsInserted = 0;
  let docsUpdated = 0;
  let chunksUpserted = 0;
  let embeddingsUpserted = 0;
  const model = embeddingModel();

  for (const { doc, chunks } of documents) {
    const fm = doc.frontmatter;

    // Upsert document
    const { data: existingDocs } = await supabase
      .from("kb_documents")
      .select("id")
      .eq("title", fm.title)
      .limit(1);

    let docId: string;

    if (existingDocs && existingDocs.length > 0) {
      docId = existingDocs[0].id;
      const { error } = await supabase
        .from("kb_documents")
        .update({
          topic: fm.topic,
          jurisdiction: fm.jurisdiction,
          source_url: fm.source_url,
          last_reviewed_at: fm.last_reviewed_at,
        })
        .eq("id", docId);
      if (error) throw new Error(`Failed to update doc "${fm.title}": ${error.message}`);
      docsUpdated++;
    } else {
      const { data: inserted, error } = await supabase
        .from("kb_documents")
        .insert({
          title: fm.title,
          topic: fm.topic,
          jurisdiction: fm.jurisdiction,
          source_url: fm.source_url,
          last_reviewed_at: fm.last_reviewed_at,
        })
        .select("id")
        .single();
      if (error || !inserted) throw new Error(`Failed to insert doc "${fm.title}": ${error?.message}`);
      docId = inserted.id;
      docsInserted++;
    }

    // Delete stale chunks beyond new chunk count
    const { data: existingChunks } = await supabase
      .from("kb_chunks")
      .select("id, chunk_index")
      .eq("document_id", docId)
      .gte("chunk_index", chunks.length);

    if (existingChunks && existingChunks.length > 0) {
      const staleIds = existingChunks.map((c) => c.id);
      await supabase.from("kb_embeddings").delete().in("chunk_id", staleIds);
      await supabase.from("kb_chunks").delete().in("id", staleIds);
    }

    // Upsert chunks + embeddings
    for (const chunk of chunks) {
      // Upsert chunk
      const { data: upsertedChunk, error: chunkErr } = await supabase
        .from("kb_chunks")
        .upsert(
          {
            document_id: docId,
            chunk_index: chunk.index,
            content: chunk.content,
            token_count: chunk.tokenCount,
            metadata: {},
          },
          { onConflict: "document_id,chunk_index" },
        )
        .select("id")
        .single();

      if (chunkErr || !upsertedChunk) {
        throw new Error(`Failed to upsert chunk[${chunk.index}] for "${fm.title}": ${chunkErr?.message}`);
      }
      chunksUpserted++;

      // Generate and upsert embedding
      const vector = await embed(chunk.content);
      const { error: embedErr } = await supabase
        .from("kb_embeddings")
        .upsert(
          {
            chunk_id: upsertedChunk.id,
            embedding: JSON.stringify(vector),
            embedding_model: model,
          },
          { onConflict: "chunk_id,embedding_model" },
        );

      if (embedErr) {
        throw new Error(`Failed to upsert embedding for chunk[${chunk.index}] of "${fm.title}": ${embedErr.message}`);
      }
      embeddingsUpserted++;
    }

    console.log(`  ✓ "${fm.title}": ${chunks.length} chunks`);
  }

  console.log("\n── Ingestion Summary ──");
  console.log(`  Documents inserted: ${docsInserted}`);
  console.log(`  Documents updated:  ${docsUpdated}`);
  console.log(`  Chunks upserted:    ${chunksUpserted}`);
  console.log(`  Embeddings upserted: ${embeddingsUpserted}`);
  console.log(`  Embedding model:    ${model}`);
  console.log("  Done!");
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
