import type { Note, SnapOptions } from "../types";
import { isDrumTrack, snapToScale } from "./scaleUtils";
import {
  clampMidiNote,
  normalizeNoteDuration,
  normalizeNoteTime,
  normalizeVelocity,
} from "./midiMath";

export const normalizeNote = (
  note: Note,
  snapOptions?: SnapOptions,
  skipSnap?: boolean
): Note => {
  let midi = note.midi;
  if (snapOptions && !skipSnap) {
    midi = snapToScale(midi, snapOptions.scaleRoot, snapOptions.scaleType);
  }

  return {
    midi: clampMidiNote(midi),
    time: normalizeNoteTime(note.time),
    duration: normalizeNoteDuration(note.duration),
    velocity: normalizeVelocity(note.velocity),
    name: note.name,
  };
};

export const normalizeAndSortNotes = (
  notes: Note[],
  snapOptions?: SnapOptions,
  trackName?: string
): Note[] => {
  if (!Array.isArray(notes)) return [];
  const skipSnap = isDrumTrack(trackName);

  return notes
    .map((note) => normalizeNote(note, snapOptions, skipSnap))
    .sort((a, b) => a.time - b.time);
};
