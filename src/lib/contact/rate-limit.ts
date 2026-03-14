interface BucketState {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;
/**
 * Hard cap on the number of tracked IPs. Prevents unbounded memory growth
 * in long-running single-instance deployments.
 * NOTE: In-memory rate limiting does not persist across restarts and does not
 * work across distributed instances. For production multi-instance deployments,
 * integrate a shared store (Redis, KV, etc.).
 */
const MAX_MAP_SIZE = 10_000;

const bucketByIp = new Map<string, BucketState>();

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

  if (bucketByIp.size > MAX_MAP_SIZE) {
    const sorted = [...bucketByIp.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    const overflow = bucketByIp.size - MAX_MAP_SIZE;
    for (let i = 0; i < overflow; i++) {
      bucketByIp.delete(sorted[i][0]);
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
