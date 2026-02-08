import { describe, expect, it } from 'vitest';
import type { MidiComposition } from '../types';
import {
  flattenCompositionNotes,
  getBeatRange,
  getPitchRange,
  buildPianoRollData
} from '../utils/pianoRollUtils';

const baseComposition: MidiComposition = {
  title: 'Piano Roll Test',
  tempo: 120,
  timeSignature: [4, 4],
  key: 'C Major',
  tracks: [
    {
      name: 'Lead',
      programNumber: 0,
      notes: [
        { midi: 60, time: 0, duration: 1, velocity: 0.9 },
        { midi: 64, time: 2, duration: 0.5, velocity: 0.8 }
      ]
    },
    {
      name: 'Bass',
      programNumber: 32,
      notes: [{ midi: 40, time: 1, duration: 2, velocity: 96 }]
    }
  ]
};

describe('flattenCompositionNotes', () => {
  it('flattens and sorts notes across all tracks', () => {
    const notes = flattenCompositionNotes(baseComposition);
    expect(notes).toHaveLength(3);
    expect(notes[0].startBeat).toBe(0);
    expect(notes[1].startBeat).toBe(1);
    expect(notes[2].startBeat).toBe(2);
    expect(notes[1].trackName).toBe('Bass');
  });

  it('normalizes unsafe values', () => {
    const composition: MidiComposition = {
      ...baseComposition,
      tracks: [
        {
          name: '',
          programNumber: 0,
          notes: [{ midi: 400, time: -2, duration: 0, velocity: 200 }]
        }
      ]
    };

    const [note] = flattenCompositionNotes(composition);
    expect(note.midi).toBe(108);
    expect(note.startBeat).toBe(0);
    expect(note.durationBeat).toBe(0.001);
    expect(note.velocity).toBe(1);
    expect(note.trackName).toBe('Track 1');
  });
});

describe('getBeatRange', () => {
  it('returns full note extent', () => {
    const range = getBeatRange(baseComposition);
    expect(range.startBeat).toBe(0);
    expect(range.endBeat).toBe(4);
    expect(range.totalBeats).toBe(4);
  });

  it('falls back to one bar when there are no notes', () => {
    const composition: MidiComposition = {
      ...baseComposition,
      timeSignature: [3, 4],
      tracks: [{ name: 'Empty', programNumber: 0, notes: [] }]
    };

    const range = getBeatRange(composition);
    expect(range.totalBeats).toBe(3);
    expect(range.endBeat).toBe(3);
  });
});

describe('getPitchRange', () => {
  it('pads around note range', () => {
    const notes = flattenCompositionNotes(baseComposition);
    const range = getPitchRange(notes, { padding: 1 });
    expect(range.minMidi).toBe(39);
    expect(range.maxMidi).toBe(65);
  });

  it('returns default limits when empty', () => {
    expect(getPitchRange([])).toEqual({ minMidi: 21, maxMidi: 108 });
  });
});

describe('buildPianoRollData', () => {
  it('combines note, beat, and pitch data', () => {
    const data = buildPianoRollData(baseComposition);
    expect(data.trackNames).toEqual(['Lead', 'Bass']);
    expect(data.notes).toHaveLength(3);
    expect(data.beatRange.totalBeats).toBe(4);
    expect(data.pitchRange.minMidi).toBe(38);
    expect(data.pitchRange.maxMidi).toBe(66);
  });
});
