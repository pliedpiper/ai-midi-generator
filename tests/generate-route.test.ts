import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_MODELS } from '../constants';

const { createCompletionMock } = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
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

    constructor(_config: unknown) {}
  }

  return {
    default: OpenAI,
    APIError,
    APIConnectionError,
    APIConnectionTimeoutError,
  };
});

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
  process.env.OPENAI_API_KEY = 'test-key';
  vi.spyOn(global, 'setInterval').mockImplementation(() => 0 as unknown as NodeJS.Timeout);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
});

describe('POST /api/generate', () => {
  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    const { POST } = await import('../app/api/generate/route');

    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Server configuration error.' });
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

  it('enforces per-IP rate limit and sets Retry-After/X-RateLimit-Remaining', async () => {
    const { POST } = await import('../app/api/generate/route');
    createCompletionMock.mockResolvedValue({
      choices: [{ message: { content: validModelJson } }],
    });

    const ip = '198.51.100.10';
    let tenthResponse: Response | undefined;

    for (let i = 0; i < 10; i++) {
      const res = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': ip }));
      expect(res.status).toBe(200);
      tenthResponse = res;
    }

    expect(tenthResponse?.headers.get('X-RateLimit-Remaining')).toBe('0');

    const blocked = await POST(makeRequest(makeValidBody(), { 'x-forwarded-for': ip }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(Number.parseInt(blocked.headers.get('Retry-After') ?? '0', 10)).toBeGreaterThan(0);
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
});
