/**
 * Pluggable embedding provider for KB ingestion and retrieval.
 *
 * Set EMBEDDING_PROVIDER env var:
 *   - "local"  (default): returns a deterministic zero vector (1536-d). FTS still works.
 *   - "openai": calls OpenAI text-embedding-3-small. Requires OPENAI_API_KEY.
 */

const DIMENSIONS = 1536;

type EmbeddingProvider = "local" | "openai";

function getProvider(): EmbeddingProvider {
  const raw = (process.env.EMBEDDING_PROVIDER ?? "local").toLowerCase().trim();
  if (raw === "openai") return "openai";
  return "local";
}

export function embeddingModel(): string {
  const provider = getProvider();
  if (provider === "openai") return "text-embedding-3-small";
  return "local-zero-stub";
}

export function embeddingDimensions(): number {
  return DIMENSIONS;
}

async function embedLocal(_text: string): Promise<number[]> {
  return new Array(DIMENSIONS).fill(0);
}

async function embedOpenAI(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI embeddings API error (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

/**
 * Generate an embedding vector for a single text input.
 * Returns a number[] of length 1536.
 */
export async function embed(text: string): Promise<number[]> {
  const provider = getProvider();
  if (provider === "openai") return embedOpenAI(text);
  return embedLocal(text);
}

/**
 * Generate embeddings for multiple texts in a single batch (OpenAI supports batching).
 * Falls back to sequential calls for providers that don't support batching.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getProvider();

  if (provider === "openai" && texts.length > 0) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai");
    }

    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: texts,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI embeddings API error (${res.status}): ${body}`);
    }

    const json = await res.json();
    return (json.data as { embedding: number[]; index: number }[])
      .sort((a, b) => a.index - b.index)
      .map((d) => d.embedding);
  }

  return Promise.all(texts.map((t) => embed(t)));
}
