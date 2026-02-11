import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  supabaseGetUserMock,
  supabaseFromMock,
  supabaseSelectMock,
  supabaseEqIdMock,
  supabaseEqUserIdMock,
  supabaseMaybeSingleMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
  supabaseEqIdMock: vi.fn(),
  supabaseEqUserIdMock: vi.fn(),
  supabaseMaybeSingleMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

const makeContext = (id: string) => ({
  params: Promise.resolve({ id })
});

beforeEach(() => {
  vi.resetModules();
  createSupabaseClientMock.mockReset();
  supabaseGetUserMock.mockReset();
  supabaseFromMock.mockReset();
  supabaseSelectMock.mockReset();
  supabaseEqIdMock.mockReset();
  supabaseEqUserIdMock.mockReset();
  supabaseMaybeSingleMock.mockReset();

  supabaseEqUserIdMock.mockReturnValue({
    maybeSingle: supabaseMaybeSingleMock
  });

  supabaseEqIdMock.mockReturnValue({
    eq: supabaseEqUserIdMock
  });

  supabaseSelectMock.mockReturnValue({
    eq: supabaseEqIdMock
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

  supabaseMaybeSingleMock.mockResolvedValue({
    data: {
      id: 'd87fca50-40e9-44da-b7d6-1910727de9fd',
      title: 'Test Generation',
      model: 'test-model',
      attempt_index: 1,
      prefs: { prompt: 'test prompt' },
      composition: {
        title: 'Test Generation',
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: []
      },
      created_at: '2026-02-11T00:00:00.000Z'
    },
    error: null
  });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/generations/[id]', () => {
  it('returns 400 for invalid id format', async () => {
    const { GET } = await import('../app/api/generations/[id]/route');

    const res = await GET(new Request('http://localhost/api/generations/not-a-uuid'), makeContext('not-a-uuid'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid generation id.' });
  });

  it('returns 401 when unauthenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { GET } = await import('../app/api/generations/[id]/route');

    const res = await GET(
      new Request('http://localhost/api/generations/d87fca50-40e9-44da-b7d6-1910727de9fd'),
      makeContext('d87fca50-40e9-44da-b7d6-1910727de9fd')
    );
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('returns 404 when generation is not found', async () => {
    supabaseMaybeSingleMock.mockResolvedValueOnce({ data: null, error: null });
    const { GET } = await import('../app/api/generations/[id]/route');

    const res = await GET(
      new Request('http://localhost/api/generations/d87fca50-40e9-44da-b7d6-1910727de9fd'),
      makeContext('d87fca50-40e9-44da-b7d6-1910727de9fd')
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Generation not found.' });
  });

  it('returns generation details when found', async () => {
    const { GET } = await import('../app/api/generations/[id]/route');

    const res = await GET(
      new Request('http://localhost/api/generations/d87fca50-40e9-44da-b7d6-1910727de9fd'),
      makeContext('d87fca50-40e9-44da-b7d6-1910727de9fd')
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.generation?.id).toBe('d87fca50-40e9-44da-b7d6-1910727de9fd');
    expect(supabaseEqIdMock).toHaveBeenCalledWith('id', 'd87fca50-40e9-44da-b7d6-1910727de9fd');
    expect(supabaseEqUserIdMock).toHaveBeenCalledWith('user_id', 'user-1');
  });
});
