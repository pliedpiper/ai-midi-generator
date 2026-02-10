import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  supabaseGetUserMock,
  supabaseFromMock,
  supabaseSelectMock,
  supabaseEqMock,
  supabaseOrderMock,
  supabaseRangeMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
  supabaseEqMock: vi.fn(),
  supabaseOrderMock: vi.fn(),
  supabaseRangeMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

beforeEach(() => {
  vi.resetModules();
  createSupabaseClientMock.mockReset();
  supabaseGetUserMock.mockReset();
  supabaseFromMock.mockReset();
  supabaseSelectMock.mockReset();
  supabaseEqMock.mockReset();
  supabaseOrderMock.mockReset();
  supabaseRangeMock.mockReset();

  supabaseOrderMock.mockReturnValue({
    range: supabaseRangeMock
  });

  supabaseEqMock.mockReturnValue({
    order: supabaseOrderMock
  });

  supabaseSelectMock.mockReturnValue({
    eq: supabaseEqMock
  });

  supabaseFromMock.mockReturnValue({
    select: supabaseSelectMock
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

  supabaseRangeMock.mockResolvedValue({
    data: [],
    error: null
  });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/generations', () => {
  it('returns 401 when unauthenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { GET } = await import('../app/api/generations/route');

    const res = await GET(new Request('http://localhost/api/generations'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('returns 400 for invalid pagination params', async () => {
    const { GET } = await import('../app/api/generations/route');

    const res = await GET(new Request('http://localhost/api/generations?limit=0&offset=-1'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'limit must be an integer between 1 and 100, and offset must be a non-negative integer.'
    });
  });

  it('returns paginated results with hasMore metadata', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      id: `generation-${index + 1}`,
      title: `Title ${index + 1}`,
      model: 'test-model',
      attempt_index: index + 1,
      prefs: {},
      composition: {},
      created_at: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`
    }));
    supabaseRangeMock.mockResolvedValueOnce({ data: rows, error: null });
    const { GET } = await import('../app/api/generations/route');

    const res = await GET(new Request('http://localhost/api/generations'));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.generations).toHaveLength(50);
    expect(body.pagination).toEqual({
      offset: 0,
      limit: 50,
      hasMore: true,
      nextOffset: 50
    });
    expect(supabaseRangeMock).toHaveBeenCalledWith(0, 50);
  });

  it('supports custom limit/offset and reports hasMore=false when exhausted', async () => {
    const rows = [
      {
        id: 'generation-a',
        title: 'A',
        model: 'test-model',
        attempt_index: 5,
        prefs: {},
        composition: {},
        created_at: '2026-01-05T00:00:00.000Z'
      },
      {
        id: 'generation-b',
        title: 'B',
        model: 'test-model',
        attempt_index: 6,
        prefs: {},
        composition: {},
        created_at: '2026-01-04T00:00:00.000Z'
      }
    ];
    supabaseRangeMock.mockResolvedValueOnce({ data: rows, error: null });
    const { GET } = await import('../app/api/generations/route');

    const res = await GET(new Request('http://localhost/api/generations?limit=2&offset=4'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.generations).toHaveLength(2);
    expect(body.pagination).toEqual({
      offset: 4,
      limit: 2,
      hasMore: false,
      nextOffset: null
    });
    expect(supabaseRangeMock).toHaveBeenCalledWith(4, 6);
  });

  it('returns 500 when query fails', async () => {
    supabaseRangeMock.mockResolvedValueOnce({ data: null, error: { message: 'db down' } });
    const { GET } = await import('../app/api/generations/route');

    const res = await GET(new Request('http://localhost/api/generations'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to fetch generations.' });
  });
});
