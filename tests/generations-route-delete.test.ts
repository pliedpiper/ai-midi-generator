import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  supabaseGetUserMock,
  supabaseFromMock,
  supabaseSelectMock,
  supabaseDeleteMock,
  countEqMock,
  deleteEqMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
  supabaseDeleteMock: vi.fn(),
  countEqMock: vi.fn(),
  deleteEqMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

const makeRequest = () => new Request('http://localhost/api/generations', { method: 'DELETE' });

beforeEach(() => {
  vi.resetModules();
  supabaseGetUserMock.mockReset();
  supabaseFromMock.mockReset();
  supabaseSelectMock.mockReset();
  supabaseDeleteMock.mockReset();
  countEqMock.mockReset();
  deleteEqMock.mockReset();
  createSupabaseClientMock.mockReset();

  supabaseSelectMock.mockReturnValue({
    eq: countEqMock
  });
  supabaseDeleteMock.mockReturnValue({
    eq: deleteEqMock
  });

  supabaseFromMock.mockReturnValue({
    select: supabaseSelectMock,
    delete: supabaseDeleteMock
  });

  createSupabaseClientMock.mockResolvedValue({
    auth: {
      getUser: supabaseGetUserMock
    },
    from: supabaseFromMock
  });

  supabaseGetUserMock.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null
  });

  countEqMock.mockResolvedValue({ count: 3, error: null });
  deleteEqMock.mockResolvedValue({ error: null });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DELETE /api/generations', () => {
  it('returns 401 when unauthenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { DELETE } = await import('../app/api/generations/route');

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('returns 500 when count query fails', async () => {
    countEqMock.mockResolvedValueOnce({ count: null, error: { message: 'count failed' } });
    const { DELETE } = await import('../app/api/generations/route');

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to delete generations.' });
    expect(deleteEqMock).not.toHaveBeenCalled();
  });

  it('returns 500 when delete query fails', async () => {
    deleteEqMock.mockResolvedValueOnce({ error: { message: 'delete failed' } });
    const { DELETE } = await import('../app/api/generations/route');

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to delete generations.' });
  });

  it('deletes all generations and returns deleted count', async () => {
    const { DELETE } = await import('../app/api/generations/route');

    const res = await DELETE(makeRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true, deletedCount: 3 });
    expect(supabaseFromMock).toHaveBeenCalledWith('generations');
    expect(supabaseSelectMock).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(supabaseDeleteMock).toHaveBeenCalled();
  });
});
