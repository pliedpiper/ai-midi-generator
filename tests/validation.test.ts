import { describe, expect, it } from 'vitest';
import { AVAILABLE_MODELS } from '../constants';
import { validateComposition, validatePrefs } from '../utils/validation';

const validPrefs = {
  prompt: 'Compose a bassline',
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

const makeNote = () => ({ midi: 60, time: 0, duration: 1 });

describe('validatePrefs', () => {
  it('rejects oversized prompt', () => {
    const result = validatePrefs({
      ...validPrefs,
      prompt: 'x'.repeat(2001),
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('2000');
    }
  });

  it('rejects oversized constraints', () => {
    const result = validatePrefs({
      ...validPrefs,
      constraints: 'x'.repeat(501),
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('500');
    }
  });

  it('rejects invalid model', () => {
    const result = validatePrefs({
      ...validPrefs,
      model: 'not-a-real-model',
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('model must be one of');
    }
  });

  it('accepts OpenRouter GPT-5.4', () => {
    const result = validatePrefs({
      ...validPrefs,
      model: 'openai/gpt-5.4',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized.model).toBe('openai/gpt-5.4');
    }
  });

  it('accepts OpenRouter GPT-5.4 Mini and GPT-5.4 Nano', () => {
    const miniResult = validatePrefs({
      ...validPrefs,
      model: 'openai/gpt-5.4-mini',
    });

    expect(miniResult.valid).toBe(true);
    if (miniResult.valid) {
      expect(miniResult.normalized.model).toBe('openai/gpt-5.4-mini');
    }

    const nanoResult = validatePrefs({
      ...validPrefs,
      model: 'openai/gpt-5.4-nano',
    });

    expect(nanoResult.valid).toBe(true);
    if (nanoResult.valid) {
      expect(nanoResult.normalized.model).toBe('openai/gpt-5.4-nano');
    }
  });

  it('normalizes clamps/defaults for valid payloads', () => {
    const result = validatePrefs({
      ...validPrefs,
      prompt: '  syncopated groove  ',
      tempo: 999,
      key: ' ',
      timeSignature: 'bad format',
      durationBars: -4,
      constraints: 12,
      attemptCount: 100,
      scaleRoot: 12.8,
      scaleType: 'made_up_mode',
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized).toMatchObject({
        prompt: 'syncopated groove',
        tempo: 300,
        key: 'C Major',
        timeSignature: '4/4',
        durationBars: 1,
        constraints: '',
        attemptCount: 5,
        scaleRoot: 11,
        scaleType: 'major',
      });
    }
  });

  it('normalizes null advanced settings to defaults', () => {
    const result = validatePrefs({
      ...validPrefs,
      tempo: null,
      key: null,
      timeSignature: null,
      durationBars: null
    });

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.normalized).toMatchObject({
        tempo: 120,
        key: 'C Major',
        timeSignature: '4/4',
        durationBars: 8
      });
    }
  });
});

describe('validateComposition limits', () => {
  it('rejects compositions with more than max tracks', () => {
    const result = validateComposition({
      title: 'Too many tracks',
      tempo: 120,
      timeSignature: [4, 4],
      key: 'C Major',
      tracks: Array.from({ length: 17 }, (_, i) => ({
        name: `Track ${i + 1}`,
        notes: [makeNote()],
      })),
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('Too many tracks');
    }
  });

  it('rejects tracks with more than max notes per track', () => {
    const result = validateComposition({
      title: 'Too many notes in one track',
      tempo: 120,
      timeSignature: [4, 4],
      key: 'C Major',
      tracks: [
        {
          name: 'Dense Track',
          notes: Array.from({ length: 1001 }, makeNote),
        },
      ],
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('too many notes');
    }
  });

  it('rejects compositions that exceed max total notes', () => {
    const result = validateComposition({
      title: 'Too many total notes',
      tempo: 120,
      timeSignature: [4, 4],
      key: 'C Major',
      tracks: Array.from({ length: 6 }, (_, i) => ({
        name: `Track ${i + 1}`,
        notes: Array.from({ length: 900 }, makeNote),
      })),
    });

    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('Too many total notes');
    }
  });
});
