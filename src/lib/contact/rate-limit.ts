interface BucketState {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const bucketByIp = new Map<string, BucketState>();

/** Evict expired buckets to prevent unbounded memory growth. */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function evictExpired(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [ip, bucket] of bucketByIp) {
    if (bucket.resetAt <= now) {
      bucketByIp.delete(ip);
    }
  }
}

export function checkContactRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  evictExpired(now);
  const existing = bucketByIp.get(ip);

  if (!existing || existing.resetAt <= now) {
    const nextState: BucketState = {
      count: 1,
      resetAt: now + WINDOW_MS,
    };
    bucketByIp.set(ip, nextState);
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: nextState.resetAt };
  }

  existing.count += 1;
  bucketByIp.set(ip, existing);

  return {
    allowed: existing.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - existing.count),
    resetAt: existing.resetAt,
  };
}
