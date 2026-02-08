import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  supabaseGetUserMock,
  supabaseRpcMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseRpcMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

const makeRequest = (body: string) =>
  new Request('http://localhost/api/account/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body
  });

beforeEach(() => {
  vi.resetModules();
  supabaseGetUserMock.mockReset();
  supabaseRpcMock.mockReset();
  createSupabaseClientMock.mockReset();

  createSupabaseClientMock.mockResolvedValue({
    auth: {
      getUser: supabaseGetUserMock
    },
    rpc: supabaseRpcMock
  });

  supabaseGetUserMock.mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@example.com' } },
    error: null
  });
  supabaseRpcMock.mockResolvedValue({ error: null });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/account/delete', () => {
  it('returns 401 for unauthenticated users', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import('../app/api/account/delete/route');

    const res = await POST(makeRequest(JSON.stringify({ confirmation: 'DELETE' })));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('../app/api/account/delete/route');

    const res = await POST(makeRequest('{bad json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body.' });
  });

  it('returns 400 when confirmation text is missing or invalid', async () => {
    const { POST } = await import('../app/api/account/delete/route');

    const res = await POST(makeRequest(JSON.stringify({ confirmation: 'NOPE' })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Type DELETE to confirm account deletion.' });
    expect(supabaseRpcMock).not.toHaveBeenCalled();
  });

  it('returns 500 when account deletion RPC fails', async () => {
    supabaseRpcMock.mockResolvedValueOnce({ error: { message: 'db error' } });
    const { POST } = await import('../app/api/account/delete/route');

    const res = await POST(makeRequest(JSON.stringify({ confirmation: 'DELETE' })));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to delete account.' });
  });

  it('deletes account on valid confirmation', async () => {
    const { POST } = await import('../app/api/account/delete/route');

    const res = await POST(makeRequest(JSON.stringify({ confirmation: 'DELETE' })));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect(supabaseRpcMock).toHaveBeenCalledWith('delete_current_user');
  });
});
