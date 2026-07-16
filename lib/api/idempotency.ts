import { createHash } from 'node:crypto';
import type { MidiComposition, UserPreferences } from '@/types';
import { getRedisClient } from '@/lib/redis';

const RESULT_TTL_SECONDS = 60 * 60 * 24;
const DEFAULT_LOCK_TTL_MS = 4 * 60 * 1000;

type LocalResultEntry = CachedGeneratePayload & { expiresAt: number };
type LocalLockEntry = { fingerprint: string; expiresAt: number };

const localResults = new Map<string, LocalResultEntry>();
const localLocks = new Map<string, LocalLockEntry>();

const readLocalResult = (
  resultKey: string,
  fingerprint: string,
  now = Date.now()
): IdempotencyReadResult => {
  const entry = localResults.get(resultKey);
  if (!entry) return { status: 'miss' };
  if (entry.expiresAt <= now) {
    localResults.delete(resultKey);
    return { status: 'miss' };
  }
  if (entry.fingerprint && entry.fingerprint !== fingerprint) {
    return { status: 'mismatch' };
  }
  return { status: 'hit', composition: entry.composition };
};

const acquireLocalLock = (
  lockKey: string,
  fingerprint: string,
  ttlMs: number,
  now = Date.now()
): IdempotencyLockResult => {
  const existing = localLocks.get(lockKey);
  if (!existing || existing.expiresAt <= now) {
    localLocks.set(lockKey, { fingerprint, expiresAt: now + ttlMs });
    return 'acquired';
  }
  return existing.fingerprint === fingerprint ? 'duplicate' : 'mismatch';
};

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
  fingerprint?: string;
};

export type IdempotencyReadResult =
  | { status: 'miss' }
  | { status: 'hit'; composition: MidiComposition }
  | { status: 'mismatch' };

export type IdempotencyLockResult = 'acquired' | 'duplicate' | 'mismatch';

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

  const candidate = raw as { composition?: unknown; fingerprint?: unknown };
  if (!candidate.composition || typeof candidate.composition !== 'object') {
    return null;
  }

  return {
    composition: candidate.composition as MidiComposition,
    fingerprint: typeof candidate.fingerprint === 'string' ? candidate.fingerprint : undefined,
  };
};

export const buildGenerateRequestFingerprint = (
  attemptIndex: number,
  prefs: UserPreferences
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        attemptIndex,
        prefs: {
          prompt: prefs.prompt,
          model: prefs.model,
          tempo: prefs.tempo,
          key: prefs.key,
          timeSignature: prefs.timeSignature,
          durationBars: prefs.durationBars,
          constraints: prefs.constraints,
          attemptCount: prefs.attemptCount,
          scaleRoot: prefs.scaleRoot,
          scaleType: prefs.scaleType,
        },
      })
    )
    .digest('hex');

export const readIdempotencyResult = async (
  resultKey: string,
  fingerprint: string
): Promise<IdempotencyReadResult> => {
  const localResult = readLocalResult(resultKey, fingerprint);
  try {
    const redis = getRedisClient();
    const raw = await redis.get(resultKey);
    const parsed = parseCachedPayload(raw);
    if (!parsed) return localResult;

    if (parsed.fingerprint && parsed.fingerprint !== fingerprint) {
      return { status: 'mismatch' };
    }

    return { status: 'hit', composition: parsed.composition };
  } catch (error) {
    console.warn('Redis idempotency read unavailable; using in-memory fallback.', error);
    return localResult;
  }
};

export const writeIdempotencyComposition = async (
  resultKey: string,
  composition: MidiComposition,
  fingerprint: string,
  ttlSeconds = RESULT_TTL_SECONDS
) => {
  localResults.set(resultKey, {
    composition,
    fingerprint,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  try {
    const redis = getRedisClient();
    await redis.set(resultKey, JSON.stringify({ composition, fingerprint }), { ex: ttlSeconds });
  } catch (error) {
    console.warn('Redis idempotency write unavailable; result kept in memory.', error);
  }
};

export const acquireIdempotencyLock = async (
  lockKey: string,
  fingerprint: string,
  ttlMs = DEFAULT_LOCK_TTL_MS
): Promise<IdempotencyLockResult> => {
  const localResult = acquireLocalLock(lockKey, fingerprint, ttlMs);
  try {
    const redis = getRedisClient();
    const result = await redis.set(lockKey, fingerprint, { nx: true, px: ttlMs });
    if (result === 'OK') return 'acquired';

    const existingFingerprint = await redis.get(lockKey);
    if (typeof existingFingerprint === 'string' && existingFingerprint !== fingerprint) {
      return 'mismatch';
    }

    return 'duplicate';
  } catch (error) {
    console.warn('Redis idempotency lock unavailable; using in-memory fallback.', error);
    return localResult;
  }
};

export const releaseIdempotencyLock = async (lockKey: string) => {
  localLocks.delete(lockKey);
  try {
    const redis = getRedisClient();
    await redis.del(lockKey);
  } catch (error) {
    console.warn('Redis idempotency unlock unavailable; local lock released.', error);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForIdempotencyResult = async (
  resultKey: string,
  fingerprint: string,
  waitMs: number,
  pollMs = 200
): Promise<IdempotencyReadResult> => {
  const deadline = Date.now() + waitMs;

  while (Date.now() < deadline) {
    const result = await readIdempotencyResult(resultKey, fingerprint);
    if (result.status !== 'miss') {
      return result;
    }
    await sleep(pollMs);
  }

  return { status: 'miss' };
};
