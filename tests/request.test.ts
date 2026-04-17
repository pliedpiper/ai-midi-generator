import { describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/api/request';

describe('getClientIp', () => {
  it('prefers trusted deployment-specific proxy headers', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.10',
        'x-vercel-forwarded-for': '203.0.113.7',
      },
    });

    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to the first valid x-forwarded-for address', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': 'not-an-ip, 198.51.100.42, 198.51.100.43',
      },
    });

    expect(getClientIp(req)).toBe('198.51.100.42');
  });

  it('returns unknown when forwarded headers are missing or malformed', () => {
    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': 'totally-invalid',
      },
    });

    expect(getClientIp(req)).toBe('unknown');
  });
});
