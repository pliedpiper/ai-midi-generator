import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_MODELS } from '../constants';

const {
  createCompletionMock,
  supabaseGetUserMock,
  supabaseInsertMock,
  getEncryptedOpenRouterKeyMock,
  decryptSecretMock,
  createSupabaseClientMock,
  checkRateLimitMock,
} = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
  supabaseGetUserMock: vi.fn(),
  supabaseInsertMock: vi.fn(),
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

const validPrefs = {
  prompt: 'A short piano motif',
  model: AVAILABLE_MODELS[0].id,
  tempo: 120,
  key: 'C Major',
  timeSignature: '4/4',
  durationBars: 8,
  constraints: '',
  attemptCount: 1,
  scaleRoot: 0,
  scaleType: 'major',
};

const validModelJson = JSON.stringify({
  title: 'Test Song',
  tempo: 120,
  timeSignature: [4, 4],
  key: 'C Major',
  tracks: [
    {
      name: 'Piano',
      notes: [{ midi: 60, time: 0, duration: 1, velocity: 0.8 }],
    },
  ],
});

const makeRequest = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/generate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body,
  });

const makeValidBody = () =>
  JSON.stringify({
    id: 1,
    prefs: validPrefs,
  });

beforeEach(() => {
  vi.resetModules();
  createCompletionMock.mockReset();
  supabaseGetUserMock.mockReset();
  supabaseInsertMock.mockReset();
  getEncryptedOpenRouterKeyMock.mockReset();
  decryptSecretMock.mockReset();
  createSupabaseClientMock.mockReset();
  checkRateLimitMock.mockReset();

  const supabaseMock = {
    auth: {
      getUser: supabaseGetUserMock,
    },
    from: vi.fn(() => ({
      insert: supabaseInsertMock,
    })),
  };

  createSupabaseClientMock.mockResolvedValue(supabaseMock);
  supabaseGetUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  getEncryptedOpenRouterKeyMock.mockResolvedValue('encrypted-key');
  decryptSecretMock.mockReturnValue('sk-or-test');
  supabaseInsertMock.mockResolvedValue({ error: null });
  checkRateLimitMock.mockResolvedValue({
    allowed: true,
    remaining: 9,
    resetIn: 60000
  });

  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/generate', () => {
  it('returns 401 when user is not authenticated', async () => {
    supabaseGetUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    const { POST } = await import('../app/api/generate/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'You must be logged in to generate MIDI.' });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('returns 400 when user has not configured OpenRouter key', async () => {
    getEncryptedOpenRouterKeyMock.mockResolvedValueOnce(null);
    const { POST } = await import('../app/api/generate/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: 'OpenRouter API key not configured. Add your key in the app settings.'
    });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('rejects invalid JSON body with 400', async () => {
    const { POST } = await import('../app/api/generate/route');

    const res = await POST(makeRequest('{ not-json'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Invalid JSON body.' });
  });

  it('enforces body size limits via content-length and parsed text length', async () => {
    const { POST } = await import('../app/api/generate/route');

    const oversizedHeaderRes = await POST(
      makeRequest('{}', {
        'content-length': '10001',
        'x-forwarded-for': '203.0.113.1',
      })
    );

    expect(oversizedHeaderRes.status).toBe(413);
    expect(await oversizedHeaderRes.json()).toEqual({ error: 'Request body too large.' });

    const hugePrompt = 'x'.repeat(10050);
    const hugeBody = JSON.stringify({
      id: 1,
      prefs: {
        ...validPrefs,
        prompt: hugePrompt,
      },
    });

    const oversizedTextRes = await POST(
      makeRequest(hugeBody, {
        'content-length': '10',
        'x-forwarded-for': '203.0.113.2',
      })
    );

    expect(oversizedTextRes.status).toBe(413);
    expect(await oversizedTextRes.json()).toEqual({ error: 'Request body too large.' });
  });

  it('enforces per-user rate limit and sets Retry-After/X-RateLimit-Remaining', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: validModelJson } }],
    });

    let callCount = 0;
    checkRateLimitMock.mockImplementation(async () => {
      callCount += 1;
      if (callCount <= 10) {
        return {
          allowed: true,
          remaining: 10 - callCount,
          resetIn: 60_000
        };
      }
      return {
        allowed: false,
        remaining: 0,
        resetIn: 30_000
      };
    });

    let tenthResponse: Response | undefined;

    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.10' }));
      expect(res.status).toBe(200);
      tenthResponse = res;
    }

    expect(tenthResponse?.headers.get('X-RateLimit-Remaining')).toBe('0');

    const blocked = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.10' }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(Number.parseInt(blocked.headers.get('Retry-After') ?? '0', 10)).toBeGreaterThan(0);
  });

  it('returns 503 when Redis rate limiter fails', async () => {
    checkRateLimitMock.mockRejectedValueOnce(new Error('redis unavailable'));
    const { POST } = await import('../app/api/generate/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'Rate limiter unavailable. Please try again shortly.' });
    expect(createCompletionMock).not.toHaveBeenCalled();
  });

  it('maps OpenAI timeout/connection/API status failures', async () => {
    const { POST } = await import('../app/api/generate/route');
    const openai = await import('openai');

    createCompletionMock.mockRejectedValueOnce(new openai.APIConnectionTimeoutError({ message: 'timeout' }));
    const timeoutRes = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.21' }));
    expect(timeoutRes.status).toBe(504);

    createCompletionMock.mockRejectedValueOnce(new openai.APIConnectionError({ message: 'offline' }));
    const connectionRes = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.22' }));
    expect(connectionRes.status).toBe(503);

    const mappings: Array<{ status: number; expected: number }> = [
      { status: 401, expected: 401 },
      { status: 402, expected: 402 },
      { status: 404, expected: 404 },
      { status: 429, expected: 429 },
      { status: 503, expected: 503 },
      { status: 418, expected: 502 },
    ];

    for (const mapping of mappings) {
      createCompletionMock.mockRejectedValueOnce(
        new openai.APIError(mapping.status, undefined, 'api error', undefined)
      );
      const res = await POST(
        makeRequest(makeValidBody(), {
          'x-forwarded-for': `198.51.100.${mapping.status}`,
        })
      );
      expect(res.status).toBe(mapping.expected);
    }
  });

  it('returns 502 when model output JSON cannot be parsed', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: '{"title":"Broken",}' } }],
    });

    const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.30' }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: 'Model returned invalid JSON.' });
  });

  it('omits model-decided advanced settings from the user prompt', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: validModelJson } }],
    });

    const requestBody = JSON.stringify({
      id: 1,
      prefs: {
        ...validPrefs,
        tempo: null,
        key: null,
        timeSignature: null,
        durationBars: null,
        constraints: '',
      },
    });

    const res = await POST(makeRequest(requestBody, { 'x-forwarded-for': '198.51.100.33' }));
    expect(res.status).toBe(200);
    expect(createCompletionMock).toHaveBeenCalledTimes(1);

    const call = createCompletionMock.mock.calls[0][0];
    const userPrompt = (call.messages as Array<{ role: string; content: string }>)
      .find(message => message.role === 'user')?.content ?? '';

    expect(userPrompt).toContain('Advanced settings: (none provided)');
    expect(userPrompt).toContain('If an advanced setting is omitted');
    expect(userPrompt).not.toContain('Tempo:');
    expect(userPrompt).not.toContain('Key:');
    expect(userPrompt).not.toContain('Time Signature:');
    expect(userPrompt).not.toContain('Length:');
    expect(userPrompt).not.toContain('Constraints:');
  });

  it('sanitizes noisy model titles before saving and returning composition', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Country Love Loop Var 4-pd2a49r',
            tempo: 120,
            timeSignature: [4, 4],
            key: 'C Major',
            tracks: [{ name: 'Piano', notes: [{ midi: 60, time: 0, duration: 1, velocity: 0.8 }] }]
          })
        }
      }]
    });

    const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.31' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.composition?.title).toBe('Country Love Loop');
    expect(supabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Country Love Loop',
        composition: expect.objectContaining({ title: 'Country Love Loop' })
      })
    );
  });

  it('uses deterministic fallback title when sanitized title is low quality', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            title: 'Var 1',
            tempo: 120,
            timeSignature: [4, 4],
            key: 'C Major',
            tracks: [{ name: 'Piano', notes: [{ midi: 60, time: 0, duration: 1, velocity: 0.8 }] }]
          })
        }
      }]
    });

    const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': '198.51.100.32' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.composition?.title).toBe('A Short Piano Motif - Take 1');
    expect(supabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'A Short Piano Motif - Take 1',
        composition: expect.objectContaining({ title: 'A Short Piano Motif - Take 1' })
      })
    );
  });
});
