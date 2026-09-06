import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: true,
      lazyConnect: false,
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[Redis] Connected successfully");
    });
  }
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export interface CacheOptions {
  ttl?: number;
  prefix?: string;
  serialize?: boolean;
}

const DEFAULT_PREFIX = "aiedu:";

function buildKey(key: string, prefix?: string): string {
  return `${prefix || DEFAULT_PREFIX}${key}`;
}

// Cache-aside pattern
export async function cacheGet<T>(
  key: string,
  options: CacheOptions = {}
): Promise<T | null> {
  const client = getRedisClient();
  const fullKey = buildKey(key, options.prefix);
  const raw = await client.get(fullKey);
  if (!raw) return null;
  if (options.serialize === false) return raw as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

export async function cacheSet<T>(
  key: string,
  value: T,
  options: CacheOptions = {}
): Promise<void> {
  const client = getRedisClient();
  const fullKey = buildKey(key, options.prefix);
  const serialized =
    options.serialize === false
      ? (value as unknown as string)
      : JSON.stringify(value);
  if (options.ttl && options.ttl > 0) {
    await client.setex(fullKey, options.ttl, serialized);
  } else {
    await client.set(fullKey, serialized);
  }
}

export async function cacheDelete(key: string, prefix?: string): Promise<void> {
  const client = getRedisClient();
  await client.del(buildKey(key, prefix));
}

export async function cacheHas(key: string, prefix?: string): Promise<boolean> {
  const client = getRedisClient();
  return (await client.exists(buildKey(key, prefix))) === 1;
}

export async function cacheTTL(key: string, prefix?: string): Promise<number> {
  const client = getRedisClient();
  return client.ttl(buildKey(key, prefix));
}

export async function cacheFlush(prefix?: string): Promise<void> {
  const client = getRedisClient();
  const pattern = `${prefix || DEFAULT_PREFIX}*`;
  const keys = await client.keys(pattern);
  if (keys.length > 0) {
    await client.del(...keys);
  }
}

export async function cacheIncrement(
  key: string,
  amount = 1,
  prefix?: string
): Promise<number> {
  const client = getRedisClient();
  return client.incrby(buildKey(key, prefix), amount);
}

export async function cacheSetEx<T>(
  key: string,
  value: T,
  ttlSeconds: number,
  prefix?: string
): Promise<void> {
  return cacheSet(key, value, { ttl: ttlSeconds, prefix });
}

// Cache-aside with fallback
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const cached = await cacheGet<T>(key, options);
  if (cached !== null) return cached;

  const value = await fetcher();
  await cacheSet(key, value, options);
  return value;
}

// Cache-aside with stale-while-revalidate
export async function cacheSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & { staleTtl?: number } = {}
): Promise<T> {
  const client = getRedisClient();
  const fullKey = buildKey(key, options.prefix);
  const raw = await client.get(fullKey);

  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { value: T; timestamp: number };
      const staleTtl = options.staleTtl || (options.ttl || 300) * 2;
      const age = (Date.now() - parsed.timestamp) / 1000;

      if (age < staleTtl) {
        if (age > (options.ttl || 300)) {
          // Stale but within SWR window — refresh in background
          fetcher()
            .then((fresh) => {
              cacheSet(
                key,
                { value: fresh, timestamp: Date.now() },
                options
              ).catch(() => {});
            })
            .catch(() => {});
        }
        return parsed.value;
      }
    } catch {
      // Corrupted cache, treat as miss
    }
  }

  const value = await fetcher();
  await cacheSet(
    key,
    { value, timestamp: Date.now() },
    options
  );
  return value;
}

// Hash operations
export async function cacheHSet(
  key: string,
  field: string,
  value: string,
  prefix?: string
): Promise<void> {
  const client = getRedisClient();
  await client.hset(buildKey(key, prefix), field, value);
}

export async function cacheHGet(
  key: string,
  field: string,
  prefix?: string
): Promise<string | null> {
  const client = getRedisClient();
  return client.hget(buildKey(key, prefix), field);
}

export async function cacheHGetAll(
  key: string,
  prefix?: string
): Promise<Record<string, string>> {
  const client = getRedisClient();
  return client.hgetall(buildKey(key, prefix));
}

export async function cacheHDel(
  key: string,
  field: string,
  prefix?: string
): Promise<void> {
  const client = getRedisClient();
  await client.hdel(buildKey(key, prefix), field);
}

// Sorted set operations (leaderboards, rankings)
export async function cacheZAdd(
  key: string,
  score: number,
  member: string,
  prefix?: string
): Promise<void> {
  const client = getRedisClient();
  await client.zadd(buildKey(key, prefix), score, member);
}

export async function cacheZRange(
  key: string,
  start: number,
  stop: number,
  prefix?: string
): Promise<string[]> {
  const client = getRedisClient();
  return client.zrange(buildKey(key, prefix), start, stop);
}

export async function cacheZRevRange(
  key: string,
  start: number,
  stop: number,
  prefix?: string
): Promise<string[]> {
  const client = getRedisClient();
  return client.zrevrange(buildKey(key, prefix), start, stop);
}

export async function cacheZScore(
  key: string,
  member: string,
  prefix?: string
): Promise<number | null> {
  const client = getRedisClient();
  return client.zscore(buildKey(key, prefix), member);
}

// List operations (queues, streams)
export async function cacheLPush(
  key: string,
  ...values: string[]
): Promise<number> {
  const client = getRedisClient();
  return client.lpush(buildKey(key), ...values);
}

export async function cacheRPop(key: string): Promise<string | null> {
  const client = getRedisClient();
  return client.rpop(buildKey(key));
}

export async function cacheLLen(key: string): Promise<number> {
  const client = getRedisClient();
  return client.llen(buildKey(key));
}

// Pub/Sub
export async function cachePublish(
  channel: string,
  message: string
): Promise<void> {
  const client = getRedisClient();
  await client.publish(channel, message);
}

export function cacheSubscribe(
  channel: string,
  callback: (message: string) => void
): () => void {
  const subscriber = getRedisClient().duplicate();
  subscriber.subscribe(channel);
  subscriber.on("message", (_ch, message) => {
    if (_ch === channel) callback(message);
  });
  return () => {
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}

// Rate limiting with Redis
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const client = getRedisClient();
  const fullKey = buildKey(`ratelimit:${key}`);
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  const multi = client.multi();
  multi.zremrangebyscore(fullKey, 0, windowStart);
  multi.zadd(fullKey, now.toString(), `${now}`);
  multi.zcard(fullKey);
  multi.expire(fullKey, windowSeconds);

  const results = await multi.exec();
  const count = (results?.[2]?.[1] as number) || 0;

  return {
    allowed: count <= maxRequests,
    remaining: Math.max(0, maxRequests - count),
    resetAt: Math.ceil((now + windowSeconds * 1000) / 1000),
  };
}

// Cache warming
export async function warmCache<T>(
  entries: Array<{ key: string; value: T; ttl?: number }>,
  prefix?: string
): Promise<void> {
  const client = getRedisClient();
  const pipeline = client.pipeline();
  for (const entry of entries) {
    const fullKey = buildKey(entry.key, prefix);
    const serialized = JSON.stringify(entry.value);
    if (entry.ttl && entry.ttl > 0) {
      pipeline.setex(fullKey, entry.ttl, serialized);
    } else {
      pipeline.set(fullKey, serialized);
    }
  }
  await pipeline.exec();
}
