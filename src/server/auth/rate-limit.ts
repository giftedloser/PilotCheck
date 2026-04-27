import type { Request, Response, NextFunction } from "express";

// Tiny in-process token bucket keyed by delegated user (or remote IP
// fallback). Sized for a single-operator desktop install: a normal
// console-clicking pace burns nowhere near the limit, but a runaway
// loop or a curl mistake gets cut off before it burns Graph quota.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

interface Limiter {
  capacity: number;
  refillPerSecond: number;
  buckets: Map<string, Bucket>;
}

function take(limiter: Limiter, key: string): boolean {
  const now = Date.now();
  let bucket = limiter.buckets.get(key);
  if (!bucket) {
    bucket = { tokens: limiter.capacity, lastRefill: now };
    limiter.buckets.set(key, bucket);
  }
  const elapsedSeconds = (now - bucket.lastRefill) / 1000;
  if (elapsedSeconds > 0) {
    bucket.tokens = Math.min(
      limiter.capacity,
      bucket.tokens + elapsedSeconds * limiter.refillPerSecond
    );
    bucket.lastRefill = now;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

function bucketKey(request: Request): string {
  return (
    request.session.delegatedUser ??
    request.session.appAccessUser ??
    request.socket.remoteAddress ??
    "anonymous"
  );
}

const actionLimiter: Limiter = {
  capacity: 30,
  refillPerSecond: 1,
  buckets: new Map()
};

/**
 * Per-user limiter for action routes. Burst of 30, sustained 1/s.
 * Tuned for a human clicking through a triage queue; well under what
 * Graph itself enforces, but enough to stop a runaway client loop.
 */
export const actionRateLimit = (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  if (!take(actionLimiter, bucketKey(request))) {
    response
      .status(429)
      .set("Retry-After", "5")
      .json({ message: "Slow down — action rate limit exceeded." });
    return;
  }
  next();
};

// Test-only: clear bucket state so suite ordering can't poison later tests.
// Production code never calls this — the buckets persist for the process lifetime.
export function __resetActionRateLimitForTests() {
  actionLimiter.buckets.clear();
}
