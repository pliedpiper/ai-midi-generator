import { MidiComposition, Note } from '../types';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

// Constants for MIDI range validation
const MIN_MIDI_NOTE = 0;
const MAX_MIDI_NOTE = 127;
const MIN_DURATION = 0.001; // Minimum duration in beats
const DEFAULT_VELOCITY = 0.8;
const MIN_TEMPO = 20;
const MAX_TEMPO = 300;
const DEFAULT_TEMPO = 120;

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
export const normalizeNote = (note: Note): Note => ({
  midi: clampMidiNote(note.midi),
  time: normalizeNoteTime(note.time),
  duration: normalizeNoteDuration(note.duration),
  velocity: normalizeVelocity(note.velocity),
  name: note.name
});

// Normalize all notes in a track and sort by time
export const normalizeAndSortNotes = (notes: Note[]): Note[] => {
  if (!Array.isArray(notes)) return [];
  return notes
    .map(normalizeNote)
    .sort((a, b) => a.time - b.time);
};

// Helper to convert our JSON composition to a Tone.js Midi object
export const createMidiObject = (composition: MidiComposition): Midi => {
  const tempo = normalizeTempo(composition.tempo);
  const secondsPerBeat = 60 / tempo;
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

    // Heuristic: If track name contains "drum", set to channel 9 (percussion channel in GM)
    track.channel = trackData.name?.toLowerCase().includes('drum') ? 9 : 0;

    const normalizedNotes = normalizeAndSortNotes(trackData.notes);
    normalizedNotes.forEach(note => {
      track.addNote({
        midi: note.midi,
        // Conversion: AI gives us Beats, Library wants Seconds.
        time: note.time * secondsPerBeat,
        duration: note.duration * secondsPerBeat,
        velocity: note.velocity
      });
    });
  });

  return midi;
};

export const generateMidiBlob = (composition: MidiComposition): Blob => {
  const midi = createMidiObject(composition);
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

export const playComposition = async (composition: MidiComposition): Promise<void> => {
  // Validate composition has playable content
  if (!composition) {
    throw new PlaybackError('No composition provided');
  }

  if (!composition.tracks || composition.tracks.length === 0) {
    throw new PlaybackError('Composition has no tracks');
  }

  const hasNotes = composition.tracks.some(t => t.notes && t.notes.length > 0);
  if (!hasNotes) {
    throw new PlaybackError('Composition has no notes to play');
  }

  // Start audio context - this may fail if browser blocks autoplay
  try {
    await Tone.start();
  } catch (err) {
    throw new PlaybackError('Failed to start audio context. Click to enable audio.');
  }

  // Clean up previous playback
  stopPlayback();

  const tempo = normalizeTempo(composition.tempo);
  const timeSig = normalizeTimeSignature(composition.timeSignature);

  Tone.Transport.bpm.value = tempo;
  Tone.Transport.timeSignature = timeSig;

  const secondsPerBeat = 60 / tempo;

  // Create a synth and part for each track
  composition.tracks.forEach(track => {
    if (!track.notes || track.notes.length === 0) return;

    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();

    // Lower volume a bit to prevent clipping with multiple tracks
    synth.volume.value = -6;
    synths.push(synth);

    const normalizedNotes = normalizeAndSortNotes(track.notes);
    const notesForTone = normalizedNotes.map(n => ({
      time: n.time * secondsPerBeat,
      note: Tone.Frequency(n.midi, "midi").toNote(),
      duration: n.duration * secondsPerBeat,
      velocity: n.velocity
    }));

    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, notesForTone).start(0);

    // Track part for cleanup
    parts.push(part);
  });

  Tone.Transport.start();
};
