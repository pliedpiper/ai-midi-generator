import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createCompletionMock,
  supabaseGetUserMock,
  getEncryptedOpenRouterKeyMock,
  decryptSecretMock,
  createSupabaseClientMock,
  checkRateLimitMock,
} = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  getEncryptedOpenRouterKeyMock: vi.fn(),
  decryptSecretMock: vi.fn(),
  createSupabaseClientMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
}));

vi.mock('openai', () => {
  class APIError extends Error {
    status?: number;
    error?: unknown;
    headers?: unknown;

    constructor(status?: number, error?: unknown, message = 'APIError', headers?: unknown) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.error = error;
      this.headers = headers;
    }
  }

  class APIConnectionError extends APIError {
    constructor({ message = 'APIConnectionError', cause }: { message?: string; cause?: Error } = {}) {
      super(undefined, undefined, message, undefined);
      this.name = 'APIConnectionError';
      if (cause) {
        (this as Error & { cause?: Error }).cause = cause;
      }
    }
  }

  class APIConnectionTimeoutError extends APIConnectionError {
    constructor({ message = 'APIConnectionTimeoutError' }: { message?: string } = {}) {
      super({ message });
      this.name = 'APIConnectionTimeoutError';
    }
  }

  class OpenAI {
    chat = {
      completions: {
        create: createCompletionMock,
      },
    };

    constructor() {}
  }

  return {
    default: OpenAI,
    APIError,
    APIConnectionError,
    APIConnectionTimeoutError,
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createClient: createSupabaseClientMock,
}));

vi.mock('@/lib/userSettings', () => ({
  getEncryptedOpenRouterKey: getEncryptedOpenRouterKeyMock,
}));

vi.mock('@/utils/encryption', () => ({
  decryptSecret: decryptSecretMock,
}));

vi.mock('@/lib/rateLimit', () => ({
  checkRateLimit: checkRateLimitMock,
}));

const makeRequest = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/prompt/improve', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });

const makeValidBody = () =>
  JSON.stringify({
    prompt: 'lofi piano loop',
    tempo: 82,
    key: 'A Minor',
    timeSignature: '4/4',
    durationBars: 8,
    constraints: 'no drums'
  });

beforeEach(() => {
  vi.resetModules();
  createCompletionMock.mockReset();
  supabaseGetUserMock.mockReset();
  getEncryptedOpenRouterKeyMock.mockReset();
  decryptSecretMock.mockReset();
  createSupabaseClientMock.mockReset();
  checkRateLimitMock.mockReset();

  createSupabaseClientMock.mockResolvedValue({
    auth: {
      getUser: supabaseGetUserMock,
    }
  });

  supabaseGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  getEncryptedOpenRouterKeyMock.mockResolvedValue('encrypted-key');
  decryptSecretMock.mockReturnValue('sk-or-test');
  checkRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetIn: 60_000
  });

  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/prompt/improve', () => {
  it('returns 401 when user is not authenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import('../app/api/prompt/improve/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'You must be logged in to improve prompts.' });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('returns 400 when user has no configured OpenRouter key', async () => {
    getEncryptedOpenRouterKeyMock.mockResolvedValueOnce(null);
    const { POST } = await import('../app/api/prompt/improve/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'OpenRouter API key not configured. Add your key in the app settings.'
    });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON body with 400', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');

    const res = await POST(makeRequest('{ not-json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body.' });
  });

  it('rejects empty prompt with 400', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    const res = await POST(makeRequest(JSON.stringify({ prompt: '   ' })));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'prompt is required and must be a non-empty string.' });
  });

  it('enforces route-level rate limit', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    checkRateLimitMock.mockResolvedValueOnce({
      allowed: false,
      remaining: 0,
      resetIn: 30_000
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: 'Too many requests. Please try again later.' });
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(Number.parseInt(res.headers.get('Retry-After') ?? '0', 10)).toBeGreaterThan(0);
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('returns improved prompt from Gemini 3 Flash', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    createCompletionMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'Warm lo-fi piano loop with sparse chords and a singable top-line motif' } }],
    });

    const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.12' }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prompt: 'Warm lo-fi piano loop with sparse chords and a singable top-line motif'
    });
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
    expect(createCompletionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'google/gemini-3-flash-preview'
      })
    );
  });

  it('strips key and BPM info from improved prompt output', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    createCompletionMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'Warm lo-fi piano loop in A minor at 82 BPM with sparse chords and a singable top-line motif.' } }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prompt: 'Warm lo-fi piano loop with sparse chords and a singable top-line motif'
    });
  });

  it('falls back to sanitized original prompt when model output is only key/BPM info', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    createCompletionMock.mockResolvedValueOnce({
      choices: [{ message: { content: 'A minor at 82 BPM' } }],
    });

    const requestBody = JSON.stringify({
      prompt: 'Lo-fi piano groove in C minor at 90 BPM with vinyl texture',
      tempo: 90,
      key: 'C Minor',
      timeSignature: '4/4',
      durationBars: 8,
      constraints: ''
    });
    const res = await POST(makeRequest(requestBody));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      prompt: 'Lo-fi piano groove with vinyl texture'
    });
  });

  it('maps OpenRouter auth failures to 401', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    const openai = await import('openai');
    createCompletionMock.mockRejectedValueOnce(
      new openai.APIError(401, undefined, 'invalid auth', undefined)
    );

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Your OpenRouter API key is invalid or expired.' });
  });

  it('falls back to original prompt when provider returns empty output', async () => {
    const { POST } = await import('../app/api/prompt/improve/route');
    createCompletionMock.mockResolvedValueOnce({
      choices: [{ message: { content: '' } }],
    });

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ prompt: 'lofi piano loop' });
  });
});
