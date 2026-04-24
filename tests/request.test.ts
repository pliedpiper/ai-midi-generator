import { afterEach, describe, expect, it } from 'vitest';
import { getClientIp } from '@/lib/api/request';

describe('getClientIp', () => {
  const originalTrustedProxyHeaders = process.env.TRUSTED_PROXY_IP_HEADERS;
  const originalVercel = process.env.VERCEL;

  afterEach(() => {
    if (originalTrustedProxyHeaders === undefined) {
      delete process.env.TRUSTED_PROXY_IP_HEADERS;
    } else {
      process.env.TRUSTED_PROXY_IP_HEADERS = originalTrustedProxyHeaders;
    }

    if (originalVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = originalVercel;
    }
  });

  it('uses the Vercel forwarded IP header on Vercel deployments', () => {
    process.env.VERCEL = '1';
    delete process.env.TRUSTED_PROXY_IP_HEADERS;

    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.10',
        'x-vercel-forwarded-for': '203.0.113.7',
      },
    });

    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('uses configured trusted proxy headers', () => {
    process.env.TRUSTED_PROXY_IP_HEADERS = 'x-forwarded-for';

    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': 'not-an-ip, 198.51.100.42, 198.51.100.43',
      },
    });

    expect(getClientIp(req)).toBe('198.51.100.42');
  });

  it('does not trust generic forwarded headers unless configured', () => {
    delete process.env.TRUSTED_PROXY_IP_HEADERS;
    delete process.env.VERCEL;

    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': '198.51.100.42',
      },
    });

    expect(getClientIp(req)).toBe('unknown');
  });

  it('returns unknown when trusted forwarded headers are missing or malformed', () => {
    process.env.TRUSTED_PROXY_IP_HEADERS = 'x-forwarded-for';

    const req = new Request('http://localhost/api/test', {
      headers: {
        'x-forwarded-for': 'totally-invalid',
      },
    });

    expect(getClientIp(req)).toBe('unknown');
  });
});
