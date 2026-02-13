import { MidiComposition, Note, SnapOptions } from '../types';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import { MIDI_LIMITS } from '../constants';
import { snapToScale, isDrumTrack } from './scaleUtils';

const {
  MIN_MIDI_NOTE,
  MAX_MIDI_NOTE,
  MIN_DURATION,
  DEFAULT_VELOCITY,
  MIN_TEMPO,
  MAX_TEMPO,
  DEFAULT_TEMPO,
  DRUM_CHANNEL,
} = MIDI_LIMITS;

// Generic clamping helper for numeric validation/normalization
export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
  return defaultValue;
}

// Convert beats to seconds based on tempo
export function beatsToSeconds(beats: number, tempo: number): number {
  return beats * (60 / tempo);
}

export const calculateCompositionMaxBeat = (
  composition: Pick<MidiComposition, 'tracks'>
): number =>
  composition.tracks.reduce((trackMax, track) => {
    const noteMax = track.notes.reduce(
      (noteEndMax, note) =>
        Math.max(noteEndMax, note.time + Math.max(note.duration, MIN_DURATION)),
      0
    );
    return Math.max(trackMax, noteMax);
  }, 0);

export const normalizeVelocity = (value: number | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_VELOCITY;
  const scaled = value > 1 ? value / 127 : value;
  return Math.max(0, Math.min(1, scaled));
};

// Clamp MIDI note to valid range (0-127)
export const clampMidiNote = (midi: number): number => {
  if (!Number.isFinite(midi)) return 60; // Default to middle C
  return Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, Math.round(midi)));
};

// Normalize note time (must be >= 0)
export const normalizeNoteTime = (time: number): number => {
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, time);
};

// Normalize note duration (must be > 0)
export const normalizeNoteDuration = (duration: number): number => {
  if (!Number.isFinite(duration) || duration <= 0) return MIN_DURATION;
  return duration;
};

// Normalize tempo with guards for non-finite values
export const normalizeTempo = (tempo: number): number => {
  if (!Number.isFinite(tempo) || tempo <= 0) return DEFAULT_TEMPO;
  return Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, tempo));
};

// Normalize time signature with guards
export const normalizeTimeSignature = (timeSig: number[]): [number, number] => {
  if (!Array.isArray(timeSig) || timeSig.length < 2) return [4, 4];
  const [num, den] = timeSig;
  const safeNum = Number.isFinite(num) && num > 0 ? Math.round(num) : 4;
  const safeDen = Number.isFinite(den) && den > 0 ? Math.round(den) : 4;
  return [safeNum, safeDen];
};

// Normalize a single note with all guards applied
export const normalizeNote = (
  note: Note,
  snapOptions?: SnapOptions,
  skipSnap?: boolean
): Note => {
  let midi = note.midi;
  // Always snap if snapOptions provided (unless skipSnap for drums)
  if (snapOptions && !skipSnap) {
    midi = snapToScale(midi, snapOptions.scaleRoot, snapOptions.scaleType);
  }
  return {
    midi: clampMidiNote(midi),
    time: normalizeNoteTime(note.time),
    duration: normalizeNoteDuration(note.duration),
    velocity: normalizeVelocity(note.velocity),
    name: note.name
  };
};

// Normalize all notes in a track and sort by time
export const normalizeAndSortNotes = (
  notes: Note[],
  snapOptions?: SnapOptions,
  trackName?: string
): Note[] => {
  if (!Array.isArray(notes)) return [];
  const skipSnap = isDrumTrack(trackName);
  return notes
    .map(note => normalizeNote(note, snapOptions, skipSnap))
    .sort((a, b) => a.time - b.time);
};

// Helper to convert our JSON composition to a Tone.js Midi object
export const createMidiObject = (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Midi => {
  const tempo = normalizeTempo(composition.tempo);
  const [num, den] = normalizeTimeSignature(composition.timeSignature);

  const midi = new Midi();
  midi.name = composition.title || 'Untitled';
  midi.header.setTempo(tempo);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den] });

  composition.tracks.forEach(trackData => {
    const track = midi.addTrack();
    track.name = trackData.name || 'Track';
    track.instrument.number = Number.isFinite(trackData.programNumber)
      ? Math.max(0, Math.min(127, Math.round(trackData.programNumber)))
      : 0;

    // Heuristic: If track name contains "drum", set to percussion channel (GM standard)
    track.channel = trackData.name?.toLowerCase().includes('drum') ? DRUM_CHANNEL : 0;

    const normalizedNotes = normalizeAndSortNotes(trackData.notes, snapOptions, trackData.name);
    normalizedNotes.forEach(note => {
      track.addNote({
        midi: note.midi,
        // Conversion: AI gives us Beats, Library wants Seconds.
        time: beatsToSeconds(note.time, tempo),
        duration: beatsToSeconds(note.duration, tempo),
        velocity: note.velocity
      });
    });
  });

  return midi;
};

export const generateMidiBlob = (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Blob => {
  const midi = createMidiObject(composition, snapOptions);
  const arrayBuffer = midi.toArray();
  return new Blob([arrayBuffer as BlobPart], { type: 'audio/midi' });
};

// Playback engine - track all parts for proper cleanup
let synths: Tone.PolySynth[] = [];
let parts: Tone.Part[] = [];

export const stopPlayback = () => {
  Tone.Transport.stop();
  Tone.Transport.cancel();

  // Dispose all parts
  parts.forEach(p => {
    try {
      p.dispose();
    } catch {
      // Ignore disposal errors
    }
  });
  parts = [];

  // Dispose all synths
  synths.forEach(s => {
    try {
      s.dispose();
    } catch {
      // Ignore disposal errors
    }
  });
  synths = [];
};

export class PlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaybackError';
  }
}

// Validate composition has playable content
function validateForPlayback(composition: MidiComposition): void {
  if (!composition) {
    throw new PlaybackError('No composition provided');
  }
  if (!composition.tracks || composition.tracks.length === 0) {
    throw new PlaybackError('Composition has no tracks');
  }
  if (!composition.tracks.some(t => t.notes && t.notes.length > 0)) {
    throw new PlaybackError('Composition has no notes to play');
  }
}

// Create a synth for a track
function createTrackSynth(): Tone.PolySynth {
  const synth = new Tone.PolySynth(Tone.Synth, {
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
  }).toDestination();
  synth.volume.value = -6;
  return synth;
}

// Schedule notes from a track into a Tone.Part
function scheduleTrackNotes(
  notes: Note[],
  synth: Tone.PolySynth,
  tempo: number,
  snapOptions?: SnapOptions,
  trackName?: string
): Tone.Part {
  const notesForTone = normalizeAndSortNotes(notes, snapOptions, trackName).map(n => ({
    time: beatsToSeconds(n.time, tempo),
    note: Tone.Frequency(n.midi, "midi").toNote(),
    duration: beatsToSeconds(n.duration, tempo),
    velocity: n.velocity
  }));

  return new Tone.Part((time, value) => {
    synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
  }, notesForTone).start(0);
}

export const playComposition = async (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Promise<void> => {
  validateForPlayback(composition);

  // Start audio context - this may fail if browser blocks autoplay
  try {
    await Tone.start();
  } catch {
    throw new PlaybackError('Failed to start audio context. Click to enable audio.');
  }

  stopPlayback();

  const tempo = normalizeTempo(composition.tempo);
  const timeSig = normalizeTimeSignature(composition.timeSignature);

  Tone.Transport.bpm.value = tempo;
  Tone.Transport.timeSignature = timeSig;

  // Create a synth and part for each track
  composition.tracks.forEach(track => {
    if (!track.notes || track.notes.length === 0) return;

    const synth = createTrackSynth();
    synths.push(synth);

    const part = scheduleTrackNotes(track.notes, synth, tempo, snapOptions, track.name);
    parts.push(part);
  });

  Tone.Transport.start();
};

// Read current transport position in beats for UI synchronization.
export const getTransportBeatPosition = (tempo: number): number => {
  const safeTempo = normalizeTempo(tempo);
  const seconds = Tone.Transport.seconds;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return seconds / (60 / safeTempo);
};

type PlaybackBeatMonitorInput = {
  tempo: number;
  maxBeat: number;
  onBeat: (beat: number) => void;
  onComplete: () => void;
  completionPaddingBeats?: number;
};

export const startPlaybackBeatMonitor = ({
  tempo,
  maxBeat,
  onBeat,
  onComplete,
  completionPaddingBeats = 0.05
}: PlaybackBeatMonitorInput): (() => void) => {
  let animationFrame = 0;
  const safeMaxBeat = Number.isFinite(maxBeat) && maxBeat > 0 ? maxBeat : 0;

  const updateBeat = () => {
    const beat = getTransportBeatPosition(tempo);
    onBeat(beat);

    if (beat >= safeMaxBeat + completionPaddingBeats) {
      onComplete();
      return;
    }

    animationFrame = requestAnimationFrame(updateBeat);
  };

  animationFrame = requestAnimationFrame(updateBeat);
  return () => cancelAnimationFrame(animationFrame);
};
