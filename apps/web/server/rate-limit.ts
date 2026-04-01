import Redis from "ioredis";
import { readEnv } from "@flowfoundry/config";

const env = readEnv();

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in seconds */
  windowSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp (seconds)
}

/** Default rate limit tiers by plan */
export const RATE_LIMIT_TIERS: Record<string, RateLimitConfig> = {
  free: { maxRequests: 60, windowSec: 60 },
  pro: { maxRequests: 300, windowSec: 60 },
  business: { maxRequests: 1000, windowSec: 60 },
  anonymous: { maxRequests: 20, windowSec: 60 },
};

/**
 * Sliding-window rate limiter backed by Redis.
 * Uses a simple INCR + EXPIRE pattern for efficiency.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig = RATE_LIMIT_TIERS.anonymous
): Promise<RateLimitResult> {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 2000 });

  try {
    const key = `rl:${identifier}`;
    const now = Math.floor(Date.now() / 1000);
    const windowKey = `${key}:${Math.floor(now / config.windowSec)}`;

    const count = await redis.incr(windowKey);
    if (count === 1) {
      await redis.expire(windowKey, config.windowSec);
    }

    const remaining = Math.max(0, config.maxRequests - count);
    const resetAt = (Math.floor(now / config.windowSec) + 1) * config.windowSec;

    return {
      allowed: count <= config.maxRequests,
      remaining,
      resetAt,
    };
  } catch (error) {
    // If Redis is down, fail open to avoid blocking all requests
    console.warn("Rate limiter Redis error, failing open:", error);
    return { allowed: true, remaining: -1, resetAt: 0 };
  } finally {
    await redis.quit();
  }
}

/**
 * Returns rate-limit HTTP headers for the response.
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.resetAt),
    ...(result.allowed ? {} : { "Retry-After": String(result.resetAt - Math.floor(Date.now() / 1000)) }),
  };
}
