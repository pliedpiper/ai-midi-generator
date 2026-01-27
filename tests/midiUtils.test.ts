import { describe, it, expect } from 'vitest';
import {
  normalizeVelocity,
  clampMidiNote,
  normalizeNoteTime,
  normalizeNoteDuration,
  normalizeTempo,
  normalizeTimeSignature,
  normalizeNote,
  normalizeAndSortNotes
} from '../utils/midiUtils';

describe('normalizeVelocity', () => {
  it('returns default for undefined', () => {
    expect(normalizeVelocity(undefined)).toBe(0.8);
  });

  it('returns default for NaN', () => {
    expect(normalizeVelocity(NaN)).toBe(0.8);
  });

  it('returns default for Infinity', () => {
    expect(normalizeVelocity(Infinity)).toBe(0.8);
  });

  it('passes through values 0-1', () => {
    expect(normalizeVelocity(0.5)).toBe(0.5);
  });

  it('clamps to 0 minimum', () => {
    expect(normalizeVelocity(-0.5)).toBe(0);
  });

  it('clamps to 1 maximum', () => {
    expect(normalizeVelocity(1.5)).toBeCloseTo(1.5 / 127);
  });

  it('converts MIDI velocity (0-127) to 0-1', () => {
    expect(normalizeVelocity(64)).toBeCloseTo(64 / 127);
    expect(normalizeVelocity(127)).toBeCloseTo(1);
  });
});

describe('clampMidiNote', () => {
  it('returns 60 for NaN', () => {
    expect(clampMidiNote(NaN)).toBe(60);
  });

  it('returns 60 for Infinity', () => {
    expect(clampMidiNote(Infinity)).toBe(60);
  });

  it('clamps to 21 minimum', () => {
    expect(clampMidiNote(-10)).toBe(21);
    expect(clampMidiNote(0)).toBe(21);
    expect(clampMidiNote(20)).toBe(21);
  });

  it('clamps to 108 maximum', () => {
    expect(clampMidiNote(200)).toBe(108);
    expect(clampMidiNote(127)).toBe(108);
    expect(clampMidiNote(109)).toBe(108);
  });

  it('rounds to nearest integer', () => {
    expect(clampMidiNote(60.7)).toBe(61);
    expect(clampMidiNote(60.4)).toBe(60);
  });

  it('passes through valid values', () => {
    expect(clampMidiNote(60)).toBe(60);
    expect(clampMidiNote(21)).toBe(21);
    expect(clampMidiNote(108)).toBe(108);
  });
});

describe('normalizeNoteTime', () => {
  it('returns 0 for NaN', () => {
    expect(normalizeNoteTime(NaN)).toBe(0);
  });

  it('returns 0 for negative values', () => {
    expect(normalizeNoteTime(-5)).toBe(0);
  });

  it('passes through positive values', () => {
    expect(normalizeNoteTime(4.5)).toBe(4.5);
  });
});

describe('normalizeNoteDuration', () => {
  it('returns minimum for NaN', () => {
    expect(normalizeNoteDuration(NaN)).toBe(0.001);
  });

  it('returns minimum for zero', () => {
    expect(normalizeNoteDuration(0)).toBe(0.001);
  });

  it('returns minimum for negative values', () => {
    expect(normalizeNoteDuration(-1)).toBe(0.001);
  });

  it('passes through positive values', () => {
    expect(normalizeNoteDuration(2.5)).toBe(2.5);
  });
});

describe('normalizeTempo', () => {
  it('returns default 120 for NaN', () => {
    expect(normalizeTempo(NaN)).toBe(120);
  });

  it('returns default 120 for zero', () => {
    expect(normalizeTempo(0)).toBe(120);
  });

  it('returns default 120 for negative', () => {
    expect(normalizeTempo(-50)).toBe(120);
  });

  it('clamps to minimum 20', () => {
    expect(normalizeTempo(10)).toBe(20);
  });

  it('clamps to maximum 300', () => {
    expect(normalizeTempo(500)).toBe(300);
  });

  it('passes through valid tempos', () => {
    expect(normalizeTempo(120)).toBe(120);
    expect(normalizeTempo(60)).toBe(60);
  });
});

describe('normalizeTimeSignature', () => {
  it('returns [4,4] for non-array', () => {
    expect(normalizeTimeSignature(null as unknown as number[])).toEqual([4, 4]);
  });

  it('returns [4,4] for empty array', () => {
    expect(normalizeTimeSignature([])).toEqual([4, 4]);
  });

  it('returns [4,4] for single element array', () => {
    expect(normalizeTimeSignature([3])).toEqual([4, 4]);
  });

  it('handles NaN in numerator', () => {
    expect(normalizeTimeSignature([NaN, 4])).toEqual([4, 4]);
  });

  it('handles negative denominator', () => {
    expect(normalizeTimeSignature([3, -4])).toEqual([3, 4]);
  });

  it('rounds fractional values', () => {
    expect(normalizeTimeSignature([3.7, 4.2])).toEqual([4, 4]);
  });

  it('passes through valid time signatures', () => {
    expect(normalizeTimeSignature([3, 4])).toEqual([3, 4]);
    expect(normalizeTimeSignature([6, 8])).toEqual([6, 8]);
  });
});

describe('normalizeNote', () => {
  it('normalizes all fields', () => {
    const note = { midi: 200, time: -5, duration: 0, velocity: 200, name: 'C4' };
    const result = normalizeNote(note);
    expect(result.midi).toBe(108); // clamped to max valid MIDI note
    expect(result.time).toBe(0);
    expect(result.duration).toBe(0.001);
    // velocity 200 > 1 -> scaled to 200/127 ≈ 1.57 -> clamped to 1
    expect(result.velocity).toBe(1);
    expect(result.name).toBe('C4');
  });

  it('preserves valid values', () => {
    const note = { midi: 60, time: 4, duration: 2, velocity: 0.7, name: 'C4' };
    const result = normalizeNote(note);
    expect(result).toEqual(note);
  });

  it('snaps note when snapOptions provided', () => {
    // C# (midi 61) should snap to C (midi 60) in C major
    const note = { midi: 61, time: 0, duration: 1, velocity: 0.8 };
    const snapOptions = { scaleRoot: 0, scaleType: 'major' };
    const result = normalizeNote(note, snapOptions);
    expect(result.midi).toBe(60);
  });

  it('does not snap when skipSnap is true', () => {
    // C# (midi 61) should remain 61 when skipSnap is true
    const note = { midi: 61, time: 0, duration: 1, velocity: 0.8 };
    const snapOptions = { scaleRoot: 0, scaleType: 'major' };
    const result = normalizeNote(note, snapOptions, true);
    expect(result.midi).toBe(61);
  });

  it('does not snap when snapOptions not provided (backward compat)', () => {
    // C# (midi 61) should remain 61 without snapOptions
    const note = { midi: 61, time: 0, duration: 1, velocity: 0.8 };
    const result = normalizeNote(note);
    expect(result.midi).toBe(61);
  });
});

describe('normalizeAndSortNotes', () => {
  it('returns empty array for non-array', () => {
    expect(normalizeAndSortNotes(null as unknown as [])).toEqual([]);
  });

  it('sorts notes by time', () => {
    const notes = [
      { midi: 60, time: 4, duration: 1, velocity: 0.8 },
      { midi: 62, time: 0, duration: 1, velocity: 0.8 },
      { midi: 64, time: 2, duration: 1, velocity: 0.8 }
    ];
    const result = normalizeAndSortNotes(notes);
    expect(result[0].time).toBe(0);
    expect(result[1].time).toBe(2);
    expect(result[2].time).toBe(4);
  });

  it('normalizes notes while sorting', () => {
    const notes = [
      { midi: 200, time: 1, duration: 0, velocity: 0.8 },
      { midi: 60, time: 0, duration: 1, velocity: 0.8 }
    ];
    const result = normalizeAndSortNotes(notes);
    expect(result[0].midi).toBe(60);
    expect(result[1].midi).toBe(108); // clamped to max valid MIDI note
    expect(result[1].duration).toBe(0.001);
  });

  it('snaps notes when snapOptions provided', () => {
    const notes = [
      { midi: 61, time: 0, duration: 1, velocity: 0.8 }, // C#
      { midi: 63, time: 1, duration: 1, velocity: 0.8 }  // D#
    ];
    const snapOptions = { scaleRoot: 0, scaleType: 'major' };
    const result = normalizeAndSortNotes(notes, snapOptions);
    expect(result[0].midi).toBe(60); // C# -> C
    expect(result[1].midi).toBe(62); // D# -> D (tie-break to lower)
  });

  it('skips snapping for drum tracks', () => {
    const notes = [
      { midi: 36, time: 0, duration: 1, velocity: 0.8 }, // Kick drum
      { midi: 38, time: 1, duration: 1, velocity: 0.8 }  // Snare
    ];
    const snapOptions = { scaleRoot: 0, scaleType: 'major' };
    const result = normalizeAndSortNotes(notes, snapOptions, 'Drum Kit');
    // Drum notes should not be snapped even though 36 and 38 aren't in C major
    expect(result[0].midi).toBe(36);
    expect(result[1].midi).toBe(38);
  });

  it('does not snap without snapOptions (backward compat)', () => {
    const notes = [
      { midi: 61, time: 0, duration: 1, velocity: 0.8 } // C#
    ];
    const result = normalizeAndSortNotes(notes);
    expect(result[0].midi).toBe(61); // Unchanged
  });
});
