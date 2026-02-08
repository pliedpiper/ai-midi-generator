import { describe, expect, it } from 'vitest';
import { createMidiObject } from '../utils/midiUtils';
import type { MidiComposition } from '../types';

describe('createMidiObject', () => {
  it('converts beats to seconds and normalizes tempo/time signature', () => {
    const composition: MidiComposition = {
      title: 'Timing Test',
      tempo: 500,
      timeSignature: [0, -4],
      key: 'C Major',
      tracks: [
        {
          name: 'Lead',
          programNumber: 130.2,
          notes: [{ midi: 60, time: 2, duration: 1, velocity: 100 }],
        },
      ],
    };

    const midi = createMidiObject(composition);

    expect(midi.header.tempos[0].bpm).toBe(300);
    expect(
      midi.header.timeSignatures.some((ts) => ts.timeSignature[0] === 4 && ts.timeSignature[1] === 4)
    ).toBe(true);

    const note = midi.tracks[0].notes[0];
    expect(note.time).toBeCloseTo(0.4, 6);
    expect(note.duration).toBeCloseTo(0.2, 6);
    expect(note.velocity).toBeCloseTo(100 / 127, 6);
    expect(midi.tracks[0].instrument.number).toBe(127);
  });
});
