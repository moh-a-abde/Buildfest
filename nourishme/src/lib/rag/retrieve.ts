/**
 * Hybrid retrieval library for the Coach RAG pipeline.
 *
 * Combines pgvector cosine similarity and Postgres full-text search,
 * merges + de-duplicates results, enforces a token budget, and returns
 * structured chunks with source metadata.
 */

import { createServerSupabaseClient } from "@/lib/supabase";
import { embed, embeddingModel } from "@/lib/embeddings";

// ── Types ──

export interface RetrieveOptions {
  query: string;
  topK?: number;
  /** Number of candidates to fetch from each source before merging */
  perSourceN?: number;
  topic?: string;
  jurisdiction?: string;
  maxTokens?: number;
  /** Optional query rewrite function (e.g. expand abbreviations) */
  queryRewrite?: (q: string) => string;
  /** Weight for vector results vs FTS (0–1). Default 0.5 = equal weight. */
  vectorWeight?: number;
  /** Minimum vector similarity threshold (0–1). Default 0.0 */
  vectorThreshold?: number;
}

export interface RetrievedChunk {
  chunkId: string;
  content: string;
  chunkIndex: number;
  tokenCount: number;
  documentId: string;
  title: string;
  sourceUrl: string | null;
  topic: string;
  jurisdiction: string;
  score: number;
  source: "fts" | "vector" | "both";
}

export interface RetrieveResult {
  chunks: RetrievedChunk[];
  sources: Array<{ documentId: string; title: string; sourceUrl: string | null }>;
  debug: {
    ftsCount: number;
    vectorCount: number;
    mergedCount: number;
    embeddingModel: string;
    queryUsed: string;
  };
}

// ── Internal types for RPC results ──

interface VectorRow {
  chunk_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  similarity: number;
  document_id: string;
  title: string;
  source_url: string | null;
  topic: string;
  jurisdiction: string;
}

interface FTSRow {
  chunk_id: string;
  content: string;
  chunk_index: number;
  token_count: number;
  rank: number;
  document_id: string;
  title: string;
  source_url: string | null;
  topic: string;
  jurisdiction: string;
}

// ── Helpers ──

function normalizeScores(scores: number[]): Map<number, number> {
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const range = max - min || 1;
  const result = new Map<number, number>();
  scores.forEach((s, i) => result.set(i, (s - min) / range));
  return result;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Main retrieval function ──

export async function retrieve(options: RetrieveOptions): Promise<RetrieveResult> {
  const {
    topK = 5,
    perSourceN = 10,
    topic,
    jurisdiction,
    maxTokens = 3000,
    queryRewrite,
    vectorWeight = 0.5,
    vectorThreshold = 0.0,
  } = options;

  const queryText = queryRewrite ? queryRewrite(options.query) : options.query;
  const supabase = createServerSupabaseClient();

  // Run vector and FTS searches in parallel
  const queryEmbedding = await embed(queryText);

  const [vectorResult, ftsResult] = await Promise.all([
    supabase.rpc("match_kb_chunks_by_vector", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: perSourceN,
      match_threshold: vectorThreshold,
      topic_filter: topic ?? null,
      jurisdiction_filter: jurisdiction ?? null,
    }),
    supabase.rpc("search_kb_chunks_fts", {
      query_text: queryText,
      match_count: perSourceN,
      topic_filter: topic ?? null,
      jurisdiction_filter: jurisdiction ?? null,
    }),
  ]);

  const vectorRows: VectorRow[] = vectorResult.data ?? [];
  const ftsRows: FTSRow[] = ftsResult.data ?? [];

  // Normalize scores per source (0–1 range)
  const vectorNorm = vectorRows.length > 0
    ? normalizeScores(vectorRows.map((r) => r.similarity))
    : new Map<number, number>();

  const ftsNorm = ftsRows.length > 0
    ? normalizeScores(ftsRows.map((r) => r.rank))
    : new Map<number, number>();

  // Merge into a single map keyed by chunk_id
  const merged = new Map<string, RetrievedChunk>();

  for (let i = 0; i < vectorRows.length; i++) {
    const row = vectorRows[i];
    const normScore = vectorNorm.get(i) ?? 0;
    merged.set(row.chunk_id, {
      chunkId: row.chunk_id,
      content: row.content,
      chunkIndex: row.chunk_index,
      tokenCount: row.token_count,
      documentId: row.document_id,
      title: row.title,
      sourceUrl: row.source_url,
      topic: row.topic,
      jurisdiction: row.jurisdiction,
      score: normScore * vectorWeight,
      source: "vector",
    });
  }

  for (let i = 0; i < ftsRows.length; i++) {
    const row = ftsRows[i];
    const normScore = ftsNorm.get(i) ?? 0;
    const ftsScore = normScore * (1 - vectorWeight);

    const existing = merged.get(row.chunk_id);
    if (existing) {
      existing.score += ftsScore;
      existing.source = "both";
    } else {
      merged.set(row.chunk_id, {
        chunkId: row.chunk_id,
        content: row.content,
        chunkIndex: row.chunk_index,
        tokenCount: row.token_count,
        documentId: row.document_id,
        title: row.title,
        sourceUrl: row.source_url,
        topic: row.topic,
        jurisdiction: row.jurisdiction,
        score: ftsScore,
        source: "fts",
      });
    }
  }

  // Sort by combined score descending, take top K
  let ranked = [...merged.values()].sort((a, b) => b.score - a.score).slice(0, topK);

  // Enforce token budget — drop lowest-scored chunks from the end
  let tokenSum = ranked.reduce((sum, c) => sum + (c.tokenCount || estimateTokens(c.content)), 0);
  while (tokenSum > maxTokens && ranked.length > 1) {
    const removed = ranked.pop()!;
    tokenSum -= removed.tokenCount || estimateTokens(removed.content);
  }

  // Build unique sources list
  const sourceMap = new Map<string, { documentId: string; title: string; sourceUrl: string | null }>();
  for (const chunk of ranked) {
    if (!sourceMap.has(chunk.documentId)) {
      sourceMap.set(chunk.documentId, {
        documentId: chunk.documentId,
        title: chunk.title,
        sourceUrl: chunk.sourceUrl,
      });
    }
  }

  return {
    chunks: ranked,
    sources: [...sourceMap.values()],
    debug: {
      ftsCount: ftsRows.length,
      vectorCount: vectorRows.length,
      mergedCount: merged.size,
      embeddingModel: embeddingModel(),
      queryUsed: queryText,
    },
  };
}
