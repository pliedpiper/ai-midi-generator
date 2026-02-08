import { Redis } from '@upstash/redis';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

const KEY_PREFIX = 'rate-limit:generate';

// Atomic fixed-window limiter:
// 1) INCR key
// 2) set window TTL on first hit
// 3) return allowed, remaining, and reset milliseconds
const RATE_LIMIT_LUA = `
local key = KEYS[1]
local window_ms = tonumber(ARGV[1])
local max_requests = tonumber(ARGV[2])

local current = redis.call("INCR", key)
if current == 1 then
  redis.call("PEXPIRE", key, window_ms)
end

local ttl = redis.call("PTTL", key)
if ttl < 0 then
  redis.call("PEXPIRE", key, window_ms)
  ttl = window_ms
end

local remaining = max_requests - current
if remaining < 0 then
  remaining = 0
end

local allowed = 0
if current <= max_requests then
  allowed = 1
end

return { allowed, remaining, ttl }
`;

let redisClient: Redis | null = null;

const getRedisEnv = () => {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis env missing. Configure KV_REST_API_URL/KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN.'
    );
  }

  return { url, token };
};

const getRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const { url, token } = getRedisEnv();
  redisClient = new Redis({ url, token });
  return redisClient;
};

export const checkRateLimit = async (
  identifier: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> => {
  const redis = getRedisClient();
  const key = `${KEY_PREFIX}:${identifier}`;

  const raw = await redis.eval(RATE_LIMIT_LUA, [key], [
    String(windowMs),
    String(maxRequests)
  ]);

  if (!Array.isArray(raw) || raw.length < 3) {
    throw new Error('Redis rate limiter returned an unexpected response.');
  }

  const allowed = Number(raw[0]) === 1;
  const remaining = Math.max(0, Number(raw[1]) || 0);
  const resetIn = Math.max(0, Number(raw[2]) || 0);

  return { allowed, remaining, resetIn };
};
