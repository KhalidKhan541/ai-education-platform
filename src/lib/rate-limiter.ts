interface TokenBucketConfig {
  capacity: number;
  refillRate: number;
  refillInterval: number;
  keyPrefix?: string;
}

interface BucketState {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  allowed: boolean;
  tokensRemaining: number;
  tokensNeeded: number;
  retryAfterMs: number;
}

export class TokenBucket {
  private buckets = new Map<string, BucketState>();
  private config: Required<TokenBucketConfig>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: TokenBucketConfig) {
    this.config = {
      capacity: config.capacity,
      refillRate: config.refillRate,
      refillInterval: config.refillInterval,
      keyPrefix: config.keyPrefix || "rl:",
    };

    // Cleanup stale buckets every 5 minutes
    this.cleanupTimer = setInterval(() => this.cleanup(), 300000);
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.buckets.clear();
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private getBucket(key: string): BucketState {
    const fullKey = this.getKey(key);
    let bucket = this.buckets.get(fullKey);

    if (!bucket) {
      bucket = {
        tokens: this.config.capacity,
        lastRefill: Date.now(),
      };
      this.buckets.set(fullKey, bucket);
    }

    return bucket;
  }

  private refill(bucket: BucketState): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const refillCount =
      Math.floor(elapsed / this.config.refillInterval) * this.config.refillRate;

    if (refillCount > 0) {
      bucket.tokens = Math.min(
        this.config.capacity,
        bucket.tokens + refillCount
      );
      bucket.lastRefill = now;
    }
  }

  consume(key: string, tokens = 1): RateLimitResult {
    const bucket = this.getBucket(key);
    this.refill(bucket);

    if (bucket.tokens >= tokens) {
      bucket.tokens -= tokens;
      return {
        allowed: true,
        tokensRemaining: bucket.tokens,
        tokensNeeded: tokens,
        retryAfterMs: 0,
      };
    }

    const deficit = tokens - bucket.tokens;
    const retryAfterMs = Math.ceil(
      (deficit / this.config.refillRate) * this.config.refillInterval
    );

    return {
      allowed: false,
      tokensRemaining: bucket.tokens,
      tokensNeeded: tokens,
      retryAfterMs,
    };
  }

  peek(key: string): number {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    return bucket.tokens;
  }

  reset(key: string): void {
    this.buckets.delete(this.getKey(key));
  }

  resetAll(): void {
    this.buckets.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    for (const [key, bucket] of this.buckets.entries()) {
      if (now - bucket.lastRefill > staleThreshold) {
        this.buckets.delete(key);
      }
    }
  }
}

// Pre-configured limiters
export const apiLimiter = new TokenBucket({
  capacity: 100,
  refillRate: 10,
  refillInterval: 60000, // 10 requests per second burst, 10 per minute sustained
});

export const authLimiter = new TokenBucket({
  capacity: 5,
  refillRate: 1,
  refillInterval: 900000, // 5 attempts, 1 per 15 minutes
  keyPrefix: "auth:",
});

export const uploadLimiter = new TokenBucket({
  capacity: 10,
  refillRate: 2,
  refillInterval: 60000,
  keyPrefix: "upload:",
});

export const searchLimiter = new TokenBucket({
  capacity: 30,
  refillRate: 5,
  refillInterval: 60000,
  keyPrefix: "search:",
});

// Sliding window rate limiter (more accurate for API rate limiting)
export class SlidingWindowLimiter {
  private windows = new Map<string, number[]>();
  private config: {
    maxRequests: number;
    windowMs: number;
    keyPrefix: string;
  };

  constructor(config: {
    maxRequests: number;
    windowMs: number;
    keyPrefix?: string;
  }) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      keyPrefix: config.keyPrefix || "sw:",
    };
  }

  private getKey(key: string): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private cleanWindow(window: number[]): number[] {
    const now = Date.now();
    return window.filter((ts) => now - ts < this.config.windowMs);
  }

  check(key: string): RateLimitResult {
    const fullKey = this.getKey(key);
    let window = this.windows.get(fullKey) || [];
    window = this.cleanWindow(window);

    const count = window.length;
    const allowed = count < this.config.maxRequests;

    if (allowed) {
      window.push(Date.now());
      this.windows.set(fullKey, window);
    }

    const oldestInWindow = window.length > 0 ? window[0] : Date.now();
    const retryAfterMs = allowed
      ? 0
      : Math.max(0, oldestInWindow + this.config.windowMs - Date.now());

    return {
      allowed,
      tokensRemaining: Math.max(0, this.config.maxRequests - count - (allowed ? 1 : 0)),
      tokensNeeded: 1,
      retryAfterMs,
    };
  }

  reset(key: string): void {
    this.windows.delete(this.getKey(key));
  }

  getRemaining(key: string): number {
    const fullKey = this.getKey(key);
    const window = this.windows.get(fullKey) || [];
    const cleaned = this.cleanWindow(window);
    return Math.max(0, this.config.maxRequests - cleaned.length);
  }
}

// Next.js middleware-compatible rate limiter
export function createMiddlewareRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (request: Request) => string;
  handler?: (request: Request) => Response;
}) {
  const limiter = new SlidingWindowLimiter({
    maxRequests: options.max,
    windowMs: options.windowMs,
  });

  return {
    check: (request: Request) => {
      const key = options.keyGenerator
        ? options.keyGenerator(request)
        : getIpFromRequest(request);
      return limiter.check(key);
    },
    getHeaders: (result: RateLimitResult) => ({
      "X-RateLimit-Limit": String(options.max),
      "X-RateLimit-Remaining": String(result.tokensRemaining),
      "X-RateLimit-Reset": String(
        Math.ceil((Date.now() + result.retryAfterMs) / 1000)
      ),
      ...(result.retryAfterMs > 0
        ? { "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)) }
        : {}),
    }),
  };
}

function getIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

// Express/Connect middleware
export function rateLimitMiddleware(
  limiter: SlidingWindowLimiter,
  options: { keyGenerator?: (req: { headers: Record<string, string | undefined>; socket: { remoteAddress?: string } }) => string; message?: string } = {}
) {
  return (
    req: { headers: Record<string, string | undefined>; socket: { remoteAddress?: string }; ip?: string },
    res: { setHeader: (name: string, value: string) => void; status: (code: number) => { json: (body: unknown) => void } },
    next: () => void
  ) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : req.ip || req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

    const result = limiter.check(key);

    res.setHeader("X-RateLimit-Limit", String(limiter["config"].maxRequests));
    res.setHeader("X-RateLimit-Remaining", String(result.tokensRemaining));
    res.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil((Date.now() + result.retryAfterMs) / 1000))
    );

    if (!result.allowed) {
      res.setHeader(
        "Retry-After",
        String(Math.ceil(result.retryAfterMs / 1000))
      );
      res.status(429).json({
        error: options.message || "Too many requests",
        retryAfterMs: result.retryAfterMs,
      });
      return;
    }

    next();
  };
}
