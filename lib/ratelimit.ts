import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { errors } from '@/lib/api';

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

// When Upstash isn't configured (local dev), limiting is a no-op.
const redis = url && token ? new Redis({ url, token }) : null;

function make(limit: number, window: `${number} m`, prefix: string) {
  return redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(limit, window),
        prefix: `tally:${prefix}`,
        analytics: false,
      })
    : null;
}

// Writes: 60/min/user. Model routes are tighter (they cost money): 20/min/user.
const writeLimiter = make(60, '1 m', 'write');
const extractLimiter = make(20, '1 m', 'extract');
const computeLimiter = make(20, '1 m', 'compute');

export type LimiterKind = 'write' | 'extract' | 'compute';

const limiters: Record<LimiterKind, Ratelimit | null> = {
  write: writeLimiter,
  extract: extractLimiter,
  compute: computeLimiter,
};

/** Throw a 429 ApiError if the identifier has exceeded the given limiter. */
export async function enforceRateLimit(
  kind: LimiterKind,
  identifier: string,
): Promise<void> {
  const limiter = limiters[kind];
  if (!limiter) return; // not configured — allow
  const { success } = await limiter.limit(identifier);
  if (!success) throw errors.rateLimited();
}
