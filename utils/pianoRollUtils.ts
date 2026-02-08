import { MIDI_LIMITS } from '../constants';
import type { MidiComposition } from '../types';

const {
  MIN_MIDI_NOTE,
  MAX_MIDI_NOTE,
  MIN_DURATION,
  DEFAULT_VELOCITY
} = MIDI_LIMITS;

export interface PianoRollNote {
  midi: number;
  startBeat: number;
  durationBeat: number;
  velocity: number;
  trackIndex: number;
  trackName: string;
}

export interface BeatRange {
  startBeat: number;
  endBeat: number;
  totalBeats: number;
}

export interface PitchRange {
  minMidi: number;
  maxMidi: number;
}

export interface PianoRollData {
  notes: PianoRollNote[];
  trackNames: string[];
  beatRange: BeatRange;
  pitchRange: PitchRange;
}

const clampMidi = (midi: number): number => {
  if (!Number.isFinite(midi)) return 60;
  return Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, Math.round(midi)));
};

const normalizeVelocity = (velocity: number | undefined): number => {
  if (typeof velocity !== 'number' || !Number.isFinite(velocity)) {
    return DEFAULT_VELOCITY;
  }
  const scaled = velocity > 1 ? velocity / 127 : velocity;
  return Math.max(0, Math.min(1, scaled));
};

export const flattenCompositionNotes = (composition: MidiComposition): PianoRollNote[] => {
  if (!composition?.tracks || composition.tracks.length === 0) {
    return [];
  }

  const flattened: PianoRollNote[] = [];

  composition.tracks.forEach((track, trackIndex) => {
    const trackName = track.name?.trim() || `Track ${trackIndex + 1}`;
    const notes = Array.isArray(track.notes) ? track.notes : [];

    notes.forEach((note) => {
      const startBeat = Number.isFinite(note.time) ? Math.max(0, note.time) : 0;
      const durationBeat = Number.isFinite(note.duration) && note.duration > 0
        ? note.duration
        : MIN_DURATION;

      flattened.push({
        midi: clampMidi(note.midi),
        startBeat,
        durationBeat,
        velocity: normalizeVelocity(note.velocity),
        trackIndex,
        trackName
      });
    });
  });

  return flattened.sort((a, b) => {
    if (a.startBeat !== b.startBeat) return a.startBeat - b.startBeat;
    return a.midi - b.midi;
  });
};

export const getBeatRange = (composition: MidiComposition): BeatRange => {
  const notes = flattenCompositionNotes(composition);
  const numerator = Array.isArray(composition?.timeSignature) && Number.isFinite(composition.timeSignature[0])
    ? Math.max(1, Math.round(composition.timeSignature[0]))
    : 4;

  if (notes.length === 0) {
    return { startBeat: 0, endBeat: numerator, totalBeats: numerator };
  }

  const startBeat = 0;
  const noteEndMax = notes.reduce(
    (max, note) => Math.max(max, note.startBeat + note.durationBeat),
    numerator
  );
  const endBeat = Math.max(noteEndMax, numerator);

  return {
    startBeat,
    endBeat,
    totalBeats: Math.max(endBeat - startBeat, 1)
  };
};

export const getPitchRange = (
  notes: PianoRollNote[],
  options?: { min?: number; max?: number; padding?: number }
): PitchRange => {
  const minOption = options?.min;
  const maxOption = options?.max;
  const paddingOption = options?.padding;

  const min = Number.isFinite(minOption) ? Math.round(minOption) : MIN_MIDI_NOTE;
  const max = Number.isFinite(maxOption) ? Math.round(maxOption) : MAX_MIDI_NOTE;
  const padding = Number.isFinite(paddingOption) ? Math.max(0, Math.round(paddingOption)) : 2;

  if (!notes.length) {
    return { minMidi: min, maxMidi: max };
  }

  const rawMin = notes.reduce((acc, note) => Math.min(acc, note.midi), max);
  const rawMax = notes.reduce((acc, note) => Math.max(acc, note.midi), min);

  return {
    minMidi: Math.max(min, rawMin - padding),
    maxMidi: Math.min(max, rawMax + padding)
  };
};

export const buildPianoRollData = (composition: MidiComposition): PianoRollData => {
  const notes = flattenCompositionNotes(composition);
  const trackNames = composition.tracks.map((track, index) => track.name?.trim() || `Track ${index + 1}`);

  return {
    notes,
    trackNames,
    beatRange: getBeatRange(composition),
    pitchRange: getPitchRange(notes)
  };
};
