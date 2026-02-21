interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * In-memory rate limiter. Returns true if the request is allowed,
 * false if the user has exceeded the limit.
 * Lazy cleanup: expired entries are removed on access.
 */
export function checkRateLimit(
  userId: string,
  maxPerHour: number = 5,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(userId);

  if (!entry || now >= entry.resetAt) {
    store.set(userId, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true, remaining: maxPerHour - 1, resetAt: now + ONE_HOUR_MS };
  }

  if (entry.count >= maxPerHour) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: maxPerHour - entry.count,
    resetAt: entry.resetAt,
  };
}
