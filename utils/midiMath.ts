import type { MidiComposition } from "../types";
import { MIDI_LIMITS } from "../constants";

const {
  MIN_MIDI_NOTE,
  MAX_MIDI_NOTE,
  MIN_DURATION,
  DEFAULT_VELOCITY,
  MIN_TEMPO,
  MAX_TEMPO,
  DEFAULT_TEMPO,
} = MIDI_LIMITS;

export function clampNumber(
  value: unknown,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
  return defaultValue;
}

export function beatsToSeconds(beats: number, tempo: number): number {
  return beats * (60 / tempo);
}

export const calculateCompositionMaxBeat = (
  composition: Pick<MidiComposition, "tracks">
): number =>
  composition.tracks.reduce((trackMax, track) => {
    const notes = Array.isArray(track.notes) ? track.notes : [];
    const noteMax = notes.reduce(
      (noteEndMax, note) =>
        Math.max(noteEndMax, note.time + Math.max(note.duration, MIN_DURATION)),
      0
    );
    return Math.max(trackMax, noteMax);
  }, 0);

export const normalizeVelocity = (value: number | undefined): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_VELOCITY;
  const scaled = value > 1 ? value / 127 : value;
  return Math.max(0, Math.min(1, scaled));
};

export const clampMidiNote = (midi: number): number => {
  if (!Number.isFinite(midi)) return 60;
  return Math.max(MIN_MIDI_NOTE, Math.min(MAX_MIDI_NOTE, Math.round(midi)));
};

export const normalizeNoteTime = (time: number): number => {
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, time);
};

export const normalizeNoteDuration = (duration: number): number => {
  if (!Number.isFinite(duration) || duration <= 0) return MIN_DURATION;
  return duration;
};

export const normalizeTempo = (tempo: number): number => {
  if (!Number.isFinite(tempo) || tempo <= 0) return DEFAULT_TEMPO;
  return Math.max(MIN_TEMPO, Math.min(MAX_TEMPO, tempo));
};

export const normalizeTimeSignature = (timeSig: number[]): [number, number] => {
  if (!Array.isArray(timeSig) || timeSig.length < 2) return [4, 4];
  const [num, den] = timeSig;
  const safeNum = Number.isFinite(num) && num > 0 ? Math.round(num) : 4;
  const safeDen = Number.isFinite(den) && den > 0 ? Math.round(den) : 4;
  return [safeNum, safeDen];
};
