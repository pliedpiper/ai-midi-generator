import type { MidiComposition } from '@/types';
import { getRedisClient } from '@/lib/redis';

const RESULT_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_LOCK_TTL_MS = 4 * 60 * 1000;

export const buildGenerateIdempotencyKeys = (
  userId: string,
  idempotencyKey: string,
  attemptId: number
) => {
  const scoped = `${userId}:${idempotencyKey}:${attemptId}`;
  return {
    lockKey: `idempotency:generate:lock:${scoped}`,
    resultKey: `idempotency:generate:result:${scoped}`
  };
};

type CachedGeneratePayload = {
  composition: MidiComposition;
};

const parseCachedPayload = (raw: unknown): CachedGeneratePayload | null => {
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return parseCachedPayload(parsed);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as { composition?: unknown };
  if (!candidate.composition || typeof candidate.composition !== 'object') {
    return null;
  }

  return { composition: candidate.composition as MidiComposition };
};

export const readIdempotencyComposition = async (
  resultKey: string
): Promise<MidiComposition | null> => {
  const redis = getRedisClient();
  const raw = await redis.get(resultKey);
  const parsed = parseCachedPayload(raw);
  return parsed?.composition ?? null;
};

export const writeIdempotencyComposition = async (
  resultKey: string,
  composition: MidiComposition,
  ttlSeconds = RESULT_TTL_SECONDS
) => {
  const redis = getRedisClient();
  await redis.set(resultKey, JSON.stringify({ composition }), { ex: ttlSeconds });
};

export const acquireIdempotencyLock = async (
  lockKey: string,
  ttlMs = DEFAULT_LOCK_TTL_MS
): Promise<boolean> => {
  const redis = getRedisClient();
  const result = await redis.set(lockKey, '1', { nx: true, px: ttlMs });
  return result === 'OK';
};

export const releaseIdempotencyLock = async (lockKey: string) => {
  const redis = getRedisClient();
  await redis.del(lockKey);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForIdempotencyComposition = async (
  resultKey: string,
  waitMs: number,
  pollMs = 200
): Promise<MidiComposition | null> => {
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    const composition = await readIdempotencyComposition(resultKey);
    if (composition) {
      return composition;
    }
    await sleep(pollMs);
  }

  return null;
};
