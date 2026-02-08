import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  exchangeCodeForSessionMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  exchangeCodeForSessionMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

beforeEach(() => {
  vi.resetModules();
  createSupabaseClientMock.mockReset();
  exchangeCodeForSessionMock.mockReset();

  createSupabaseClientMock.mockResolvedValue({
    auth: {
      exchangeCodeForSession: exchangeCodeForSessionMock
    }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /auth/callback', () => {
  it('rejects protocol-relative next target and redirects to root', async () => {
    const { GET } = await import('@/app/auth/callback/route');
    const req = new Request('http://localhost/auth/callback?code=abc123&next=%2F%2Fevil.example');

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/');
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc123');
  });

  it('preserves safe local next target', async () => {
    const { GET } = await import('@/app/auth/callback/route');
    const req = new Request('http://localhost/auth/callback?code=abc123&next=%2Fgenerations%3Fq%3Dlofi%23results');

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/generations?q=lofi#results');
    expect(exchangeCodeForSessionMock).toHaveBeenCalledWith('abc123');
  });

  it('does not exchange session when code is missing', async () => {
    const { GET } = await import('@/app/auth/callback/route');
    const req = new Request('http://localhost/auth/callback?next=%2Faccount');

    const res = await GET(req);
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/account');
    expect(exchangeCodeForSessionMock).not.toHaveBeenCalled();
  });
});
