import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRedisClientMock } = vi.hoisted(() => ({
  getRedisClientMock: vi.fn(),
}));

vi.mock('@/lib/redis', () => ({
  getRedisClient: getRedisClientMock,
}));

const composition = {
  title: 'Fallback Song',
  tempo: 120,
  timeSignature: [4, 4] as [number, number],
  key: 'C Major',
  tracks: [{ name: 'Piano', programNumber: 0, notes: [] }],
};

beforeEach(() => {
  vi.resetModules();
  getRedisClientMock.mockReset();
  getRedisClientMock.mockImplementation(() => {
    throw new Error('Redis unavailable');
  });
});

describe('Redis fallbacks', () => {
  it('enforces rate limits in memory when Redis is unavailable', async () => {
    const { checkRateLimit } = await import('@/lib/rateLimit');
    const identifier = `fallback-${crypto.randomUUID()}`;

    expect(await checkRateLimit(identifier, 2, 60_000)).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(await checkRateLimit(identifier, 2, 60_000)).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(await checkRateLimit(identifier, 2, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
  });

  it('acquires, replays, detects mismatches, and releases in memory', async () => {
    const {
      acquireIdempotencyLock,
      readIdempotencyResult,
      releaseIdempotencyLock,
      writeIdempotencyComposition,
    } = await import('@/lib/api/idempotency');
    const suffix = crypto.randomUUID();
    const lockKey = `lock:${suffix}`;
    const resultKey = `result:${suffix}`;

    await expect(acquireIdempotencyLock(lockKey, 'fingerprint-a')).resolves.toBe('acquired');
    await expect(acquireIdempotencyLock(lockKey, 'fingerprint-a')).resolves.toBe('duplicate');
    await expect(acquireIdempotencyLock(lockKey, 'fingerprint-b')).resolves.toBe('mismatch');

    await writeIdempotencyComposition(resultKey, composition, 'fingerprint-a');
    await expect(readIdempotencyResult(resultKey, 'fingerprint-a')).resolves.toEqual({
      status: 'hit',
      composition,
    });
    await expect(readIdempotencyResult(resultKey, 'fingerprint-b')).resolves.toEqual({
      status: 'mismatch',
    });

    await releaseIdempotencyLock(lockKey);
    await expect(acquireIdempotencyLock(lockKey, 'fingerprint-b')).resolves.toBe('acquired');
  });

  it('falls back when an existing Redis client rejects operations', async () => {
    getRedisClientMock.mockReturnValue({
      eval: vi.fn().mockRejectedValue(new Error('stale service')),
      get: vi.fn().mockRejectedValue(new Error('stale service')),
      set: vi.fn().mockRejectedValue(new Error('stale service')),
      del: vi.fn().mockRejectedValue(new Error('stale service')),
    });

    const { checkRateLimit } = await import('@/lib/rateLimit');
    const { acquireIdempotencyLock, writeIdempotencyComposition, readIdempotencyResult } =
      await import('@/lib/api/idempotency');
    const suffix = crypto.randomUUID();

    await expect(checkRateLimit(`stale-${suffix}`, 1, 60_000)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    });
    await expect(acquireIdempotencyLock(`lock:${suffix}`, 'fingerprint')).resolves.toBe('acquired');
    await writeIdempotencyComposition(`result:${suffix}`, composition, 'fingerprint');
    await expect(readIdempotencyResult(`result:${suffix}`, 'fingerprint')).resolves.toMatchObject({
      status: 'hit',
    });
  });
});
