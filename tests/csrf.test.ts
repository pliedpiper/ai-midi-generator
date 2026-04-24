import { describe, expect, it } from 'vitest';
import { enforceSameOriginRequest } from '@/lib/api/csrf';

describe('enforceSameOriginRequest', () => {
  it('allows same-origin requests', () => {
    const req = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://example.com'
      }
    });

    expect(enforceSameOriginRequest(req)).toBeNull();
  });

  it('allows requests without browser Origin metadata', () => {
    const req = new Request('https://example.com/api/test', {
      method: 'POST'
    });

    expect(enforceSameOriginRequest(req)).toBeNull();
  });

  it('rejects cross-origin requests', async () => {
    const req = new Request('https://example.com/api/test', {
      method: 'POST',
      headers: {
        origin: 'https://evil.example'
      }
    });

    const response = enforceSameOriginRequest(req);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      error: 'Cross-site requests are not allowed.'
    });
  });

  it('rejects cross-site fetch metadata even without Origin', async () => {
    const req = new Request('https://example.com/api/test', {
      method: 'DELETE',
      headers: {
        'sec-fetch-site': 'cross-site'
      }
    });

    const response = enforceSameOriginRequest(req);
    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      error: 'Cross-site requests are not allowed.'
    });
  });
});
