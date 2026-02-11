import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AVAILABLE_MODELS } from '../constants';
import { generateAttempt, improvePrompt } from '../services/openRouterService';
import type { UserPreferences } from '../types';

const validPrefs: UserPreferences = {
  prompt: 'Compose something chill',
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

beforeEach(() => {
  vi.spyOn(global, 'fetch');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('generateAttempt', () => {
  it('surfaces API error message from response JSON', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Provider rate limit reached.' }),
    } as unknown as Response);

    await expect(generateAttempt(1, validPrefs, 'batch-1')).rejects.toThrow('Provider rate limit reached.');
  });

  it('handles non-JSON error bodies with fallback message', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON body')),
    } as unknown as Response);

    await expect(generateAttempt(1, validPrefs, 'batch-1')).rejects.toThrow('Failed to generate MIDI composition.');
  });

  it('rejects when server response is missing composition', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(generateAttempt(1, validPrefs, 'batch-1')).rejects.toThrow('Invalid response from server.');
  });

  it('sends idempotencyKey in request payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        composition: {
          title: 'x',
          tempo: 120,
          timeSignature: [4, 4],
          key: 'C Major',
          tracks: []
        }
      }),
    } as unknown as Response);

    await generateAttempt(1, validPrefs, 'batch-abc');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/generate',
      expect.objectContaining({
        body: JSON.stringify({
          id: 1,
          prefs: validPrefs,
          idempotencyKey: 'batch-abc'
        })
      })
    );
  });
});

describe('improvePrompt', () => {
  it('surfaces API error message from response JSON', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 'Prompt improver unavailable.' }),
    } as unknown as Response);

    await expect(improvePrompt({
      prompt: 'A simple loop',
      tempo: 120,
      key: 'C Major',
      timeSignature: '4/4',
      durationBars: 8,
      constraints: 'No drums'
    })).rejects.toThrow('Prompt improver unavailable.');
  });

  it('rejects when server response is missing prompt', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    } as unknown as Response);

    await expect(improvePrompt({
      prompt: 'A simple loop',
      tempo: 120,
      key: 'C Major',
      timeSignature: '4/4',
      durationBars: 8,
      constraints: ''
    })).rejects.toThrow('Invalid response from server.');
  });
});
