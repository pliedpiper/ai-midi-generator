import { describe, it, expect } from 'vitest';
import { extractJson, validateComposition } from '../utils/validation';

describe('extractJson', () => {
  it('extracts JSON from clean string', () => {
    const input = '{"title": "Test"}';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it('extracts JSON from markdown code fence', () => {
    const input = '```json\n{"title": "Test"}\n```';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it('extracts JSON from code fence without language hint', () => {
    const input = '```\n{"title": "Test"}\n```';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it('extracts JSON with surrounding text', () => {
    const input = 'Here is the composition:\n{"title": "Test"}\nEnjoy!';
    expect(extractJson(input)).toBe('{"title": "Test"}');
  });

  it('extracts the first complete JSON object when more text follows', () => {
    const input = '{"title": "First"} trailing text {"title": "Second"}';
    expect(extractJson(input)).toBe('{"title": "First"}');
  });

  it('handles nested braces', () => {
    const input = '{"tracks": [{"notes": [{"midi": 60}]}]}';
    expect(extractJson(input)).toBe('{"tracks": [{"notes": [{"midi": 60}]}]}');
  });

  it('throws on empty input', () => {
    expect(() => extractJson('')).toThrow('Empty response from OpenRouter');
  });

  it('throws on whitespace-only input', () => {
    expect(() => extractJson('   \n   ')).toThrow('Empty response from OpenRouter');
  });

  it('throws when no JSON found', () => {
    expect(() => extractJson('No JSON here')).toThrow('No JSON object found in model response');
  });

  it('throws on unclosed brace', () => {
    expect(() => extractJson('{"title": "Test"')).toThrow('No JSON object found in model response');
  });
});

describe('validateComposition', () => {
  const validComposition = {
    title: 'Test Song',
    tempo: 120,
    timeSignature: [4, 4],
    key: 'C Major',
    tracks: [
      {
        name: 'Piano',
        programNumber: 0,
        notes: [
          { midi: 60, time: 0, duration: 1, velocity: 0.8 }
        ]
      }
    ]
  };

  it('accepts valid composition', () => {
    const result = validateComposition(validComposition);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.title).toBe('Test Song');
    }
  });

  it('rejects null input', () => {
    const result = validateComposition(null);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('not an object');
    }
  });

  it('rejects missing title', () => {
    const noTitle = { ...validComposition, title: undefined };
    const result = validateComposition(noTitle);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('title');
    }
  });

  it('rejects non-finite tempo', () => {
    const result = validateComposition({ ...validComposition, tempo: Infinity });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('tempo');
    }
  });

  it('rejects zero tempo', () => {
    const result = validateComposition({ ...validComposition, tempo: 0 });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('tempo');
    }
  });

  it('rejects invalid time signature format', () => {
    const result = validateComposition({ ...validComposition, timeSignature: [4] });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('timeSignature');
    }
  });

  it('rejects non-integer time signature values', () => {
    const result = validateComposition({ ...validComposition, timeSignature: [4.5, 4] });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('timeSignature');
    }
  });

  it('rejects empty tracks array', () => {
    const result = validateComposition({ ...validComposition, tracks: [] });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('tracks');
    }
  });

  it('rejects track with invalid note structure', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', notes: [{ midi: 60 }] }] // missing time, duration
    });
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('track');
    }
  });

  it('rejects notes outside the MIDI range', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', notes: [{ midi: -1, time: 0, duration: 1 }] }]
    });
    expect(result.valid).toBe(false);
  });

  it('rejects notes with negative time', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', notes: [{ midi: 60, time: -1, duration: 1 }] }]
    });
    expect(result.valid).toBe(false);
  });

  it('rejects notes with zero duration', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', notes: [{ midi: 60, time: 0, duration: 0 }] }]
    });
    expect(result.valid).toBe(false);
  });

  it('normalizes missing programNumber to 0', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', notes: [{ midi: 60, time: 0, duration: 1 }] }]
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.tracks[0].programNumber).toBe(0);
    }
  });

  it('clamps programNumber to 0-127', () => {
    const result = validateComposition({
      ...validComposition,
      tracks: [{ name: 'Piano', programNumber: 200, notes: [{ midi: 60, time: 0, duration: 1 }] }]
    });
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.composition.tracks[0].programNumber).toBe(0); // Falls back to default
    }
  });
});
