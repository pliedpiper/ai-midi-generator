import { describe, it, expect } from 'vitest';
import {
  buildScaleSet,
  snapToScale,
  parseKeyString,
  isDrumTrack
} from '../utils/scaleUtils';

describe('buildScaleSet', () => {
  it('builds C major scale correctly', () => {
    const set = buildScaleSet(0, 'major');
    // C major: C, D, E, F, G, A, B (0, 2, 4, 5, 7, 9, 11)
    expect(set.has(0)).toBe(true);  // C
    expect(set.has(2)).toBe(true);  // D
    expect(set.has(4)).toBe(true);  // E
    expect(set.has(5)).toBe(true);  // F
    expect(set.has(7)).toBe(true);  // G
    expect(set.has(9)).toBe(true);  // A
    expect(set.has(11)).toBe(true); // B
    expect(set.has(1)).toBe(false); // C#
    expect(set.has(3)).toBe(false); // D#
    expect(set.size).toBe(7);
  });

  it('builds G major scale correctly', () => {
    const set = buildScaleSet(7, 'major');
    // G major: G, A, B, C, D, E, F# (7, 9, 11, 0, 2, 4, 6)
    expect(set.has(7)).toBe(true);  // G
    expect(set.has(9)).toBe(true);  // A
    expect(set.has(11)).toBe(true); // B
    expect(set.has(0)).toBe(true);  // C
    expect(set.has(2)).toBe(true);  // D
    expect(set.has(4)).toBe(true);  // E
    expect(set.has(6)).toBe(true);  // F#
    expect(set.has(5)).toBe(false); // F natural
    expect(set.size).toBe(7);
  });

  it('builds A minor scale correctly', () => {
    const set = buildScaleSet(9, 'natural_minor');
    // A natural minor: A, B, C, D, E, F, G (9, 11, 0, 2, 4, 5, 7)
    expect(set.has(9)).toBe(true);  // A
    expect(set.has(11)).toBe(true); // B
    expect(set.has(0)).toBe(true);  // C
    expect(set.has(2)).toBe(true);  // D
    expect(set.has(4)).toBe(true);  // E
    expect(set.has(5)).toBe(true);  // F
    expect(set.has(7)).toBe(true);  // G
    expect(set.has(8)).toBe(false); // G#
    expect(set.size).toBe(7);
  });

  it('returns all pitch classes for chromatic scale', () => {
    const set = buildScaleSet(0, 'chromatic');
    expect(set.size).toBe(12);
    for (let i = 0; i < 12; i++) {
      expect(set.has(i)).toBe(true);
    }
  });

  it('returns all pitch classes for unknown scale type', () => {
    const set = buildScaleSet(0, 'unknown_scale');
    expect(set.size).toBe(12);
  });
});

describe('snapToScale', () => {
  it('returns unchanged for notes already in scale', () => {
    // C (midi 60) is in C major
    expect(snapToScale(60, 0, 'major')).toBe(60);
    // E (midi 64) is in C major
    expect(snapToScale(64, 0, 'major')).toBe(64);
    // G (midi 67) is in C major
    expect(snapToScale(67, 0, 'major')).toBe(67);
  });

  it('snaps C# down to C in C major (nearest lower)', () => {
    // C# (midi 61) should snap to C (midi 60) in C major
    expect(snapToScale(61, 0, 'major')).toBe(60);
  });

  it('snaps D# down to D in C major (tie-break to lower)', () => {
    // D# (midi 63) is equidistant from D (62) and E (64)
    // Should prefer lower (D)
    expect(snapToScale(63, 0, 'major')).toBe(62);
  });

  it('snaps F# up to G in C major (nearer to G)', () => {
    // F# (midi 66) is between F (65) and G (67)
    // F# is 1 away from G, 1 away from F - tie-break to lower F
    expect(snapToScale(66, 0, 'major')).toBe(65);
  });

  it('snaps A# down to A in C major', () => {
    // A# (midi 70) is between A (69) and B (71)
    // Both are 1 away, tie-break to lower (A)
    expect(snapToScale(70, 0, 'major')).toBe(69);
  });

  it('returns unchanged for chromatic scale', () => {
    // All notes valid in chromatic, no snapping
    expect(snapToScale(61, 0, 'chromatic')).toBe(61);
    expect(snapToScale(63, 0, 'chromatic')).toBe(63);
  });

  it('handles notes in higher octaves', () => {
    // C5 (midi 72) is in C major
    expect(snapToScale(72, 0, 'major')).toBe(72);
    // C#5 (midi 73) should snap to C5 (midi 72)
    expect(snapToScale(73, 0, 'major')).toBe(72);
  });

  it('works with different scale roots', () => {
    // In D major: D, E, F#, G, A, B, C#
    // D (midi 62) is in D major
    expect(snapToScale(62, 2, 'major')).toBe(62);
    // D# (midi 63) should snap to D (midi 62) - nearer
    expect(snapToScale(63, 2, 'major')).toBe(62);
    // F (midi 65) is equidistant from E (64) and F# (66), tie-break to lower E
    expect(snapToScale(65, 2, 'major')).toBe(64);
  });
});

describe('parseKeyString', () => {
  it('parses "C Major"', () => {
    const result = parseKeyString('C Major');
    expect(result).toEqual({ scaleRoot: 0, scaleType: 'major' });
  });

  it('parses "F# Minor"', () => {
    const result = parseKeyString('F# Minor');
    expect(result).toEqual({ scaleRoot: 6, scaleType: 'natural_minor' });
  });

  it('parses "Bb Dorian"', () => {
    const result = parseKeyString('Bb Dorian');
    expect(result).toEqual({ scaleRoot: 10, scaleType: 'dorian' });
  });

  it('parses lowercase "c major"', () => {
    const result = parseKeyString('c major');
    expect(result).toEqual({ scaleRoot: 0, scaleType: 'major' });
  });

  it('parses "D" with no scale type (defaults to major)', () => {
    const result = parseKeyString('D');
    expect(result).toEqual({ scaleRoot: 2, scaleType: 'major' });
  });

  it('parses "A min" (abbreviated minor)', () => {
    const result = parseKeyString('A min');
    expect(result).toEqual({ scaleRoot: 9, scaleType: 'natural_minor' });
  });

  it('returns null for empty string', () => {
    expect(parseKeyString('')).toBe(null);
  });

  it('returns null for invalid input', () => {
    expect(parseKeyString('invalid')).toBe(null);
    expect(parseKeyString('123')).toBe(null);
  });

  it('defaults to major for unknown scale type', () => {
    const result = parseKeyString('C unknown');
    expect(result).toEqual({ scaleRoot: 0, scaleType: 'major' });
  });
});

describe('isDrumTrack', () => {
  it('returns true for "Drums"', () => {
    expect(isDrumTrack('Drums')).toBe(true);
  });

  it('returns true for "Drum Kit"', () => {
    expect(isDrumTrack('Drum Kit')).toBe(true);
  });

  it('returns true for "Percussion"', () => {
    expect(isDrumTrack('Percussion')).toBe(true);
  });

  it('returns true for "drum" (lowercase)', () => {
    expect(isDrumTrack('drum')).toBe(true);
  });

  it('returns false for "Piano"', () => {
    expect(isDrumTrack('Piano')).toBe(false);
  });

  it('returns false for "Bass"', () => {
    expect(isDrumTrack('Bass')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isDrumTrack(undefined)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDrumTrack('')).toBe(false);
  });
});
