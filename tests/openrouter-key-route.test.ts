import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createSupabaseClientMock,
  supabaseGetUserMock,
  supabaseFromMock,
  supabaseSelectMock,
  supabaseDeleteMock,
  eqForSelectMock,
  eqForDeleteMock,
  maybeSingleMock,
  upsertEncryptedOpenRouterKeyMock,
  getEncryptedOpenRouterKeyMock
} = vi.hoisted(() => ({
  createSupabaseClientMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseFromMock: vi.fn(),
  supabaseSelectMock: vi.fn(),
  supabaseDeleteMock: vi.fn(),
  eqForSelectMock: vi.fn(),
  eqForDeleteMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertEncryptedOpenRouterKeyMock: vi.fn(),
  getEncryptedOpenRouterKeyMock: vi.fn()
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock
}));

vi.mock('@/lib/userSettings', () => ({
  getEncryptedOpenRouterKey: getEncryptedOpenRouterKeyMock,
  upsertEncryptedOpenRouterKey: upsertEncryptedOpenRouterKeyMock,
  validateOpenRouterApiKey: (apiKey: unknown) =>
    typeof apiKey === 'string' && apiKey.startsWith('sk-or-')
      ? { valid: true, normalized: apiKey }
      : { valid: false, error: 'invalid key' }
}));

vi.mock('@/utils/encryption', () => ({
  encryptSecret: (value: string) => `encrypted:${value}`
}));

const makeDeleteRequest = () =>
  new Request('http://localhost/api/user/openrouter-key', { method: 'DELETE' });

beforeEach(() => {
  vi.resetModules();
  createSupabaseClientMock.mockReset();
  supabaseGetUserMock.mockReset();
  supabaseFromMock.mockReset();
  supabaseSelectMock.mockReset();
  supabaseDeleteMock.mockReset();
  eqForSelectMock.mockReset();
  eqForDeleteMock.mockReset();
  maybeSingleMock.mockReset();
  upsertEncryptedOpenRouterKeyMock.mockReset();
  getEncryptedOpenRouterKeyMock.mockReset();

  eqForSelectMock.mockReturnValue({
    maybeSingle: maybeSingleMock
  });
  supabaseSelectMock.mockReturnValue({
    eq: eqForSelectMock
  });

  supabaseDeleteMock.mockReturnValue({
    eq: eqForDeleteMock
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

  maybeSingleMock.mockResolvedValue({
    data: {
      openrouter_api_key_encrypted: 'encrypted-key',
      updated_at: '2026-02-08T15:00:00.000Z'
    },
    error: null
  });
  eqForDeleteMock.mockResolvedValue({ error: null });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('/api/user/openrouter-key route', () => {
  it('GET returns configured status and updatedAt', async () => {
    const { GET } = await import('../app/api/user/openrouter-key/route');

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      configured: true,
      updatedAt: '2026-02-08T15:00:00.000Z'
    });
  });

  it('GET returns 401 when unauthenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { GET } = await import('../app/api/user/openrouter-key/route');

    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized.' });
  });

  it('DELETE removes stored key for current user', async () => {
    const { DELETE } = await import('../app/api/user/openrouter-key/route');

    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ configured: false, removed: true });
    expect(supabaseFromMock).toHaveBeenCalledWith('user_settings');
    expect(supabaseDeleteMock).toHaveBeenCalled();
    expect(eqForDeleteMock).toHaveBeenCalledWith('user_id', 'user-1');
  });

  it('DELETE returns 500 when deletion fails', async () => {
    eqForDeleteMock.mockResolvedValueOnce({ error: { message: 'failed' } });
    const { DELETE } = await import('../app/api/user/openrouter-key/route');

    const res = await DELETE(makeDeleteRequest());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Failed to remove API key.' });
  });
});
