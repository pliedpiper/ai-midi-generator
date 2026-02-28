import { Redis } from '@upstash/redis';

const REDIS_URL_ENV_VERCEL = 'KV_REST_API_URL';
const REDIS_TOKEN_ENV_VERCEL = 'KV_REST_API_TOKEN';
const REDIS_URL_ENV_UPSTASH = 'UPSTASH_REDIS_REST_URL';
const REDIS_TOKEN_ENV_UPSTASH = 'UPSTASH_REDIS_REST_TOKEN';

let redisClient: Redis | null = null;

const getRedisEnv = () => {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      `Redis env missing. Configure ${REDIS_URL_ENV_VERCEL}/${REDIS_TOKEN_ENV_VERCEL} or ${REDIS_URL_ENV_UPSTASH}/${REDIS_TOKEN_ENV_UPSTASH}.`
    );
  }

  return { url, token };
};

export const getRedisClient = (): Redis => {
  if (redisClient) {
    return redisClient;
  }

  const { url, token } = getRedisEnv();
  redisClient = new Redis({ url, token });
  return redisClient;
};
