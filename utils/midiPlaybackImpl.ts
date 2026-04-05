import * as Tone from "tone";
import type { MidiComposition, Note, SnapOptions } from "../types";
import { normalizeAndSortNotes } from "./midiData";
import { beatsToSeconds, normalizeTempo, normalizeTimeSignature } from "./midiMath";
import { PlaybackError } from "./midiPlaybackError";

let synths: Tone.PolySynth[] = [];
let parts: Tone.Part[] = [];

export const stopPlayback = () => {
  Tone.Transport.stop();
  Tone.Transport.cancel();

  parts.forEach((part) => {
    try {
      part.dispose();
    } catch {
      // Ignore disposal errors.
    }
  });
  parts = [];

  synths.forEach((synth) => {
    try {
      synth.dispose();
    } catch {
      // Ignore disposal errors.
    }
  });
  synths = [];
};

const validateForPlayback = (composition: MidiComposition): void => {
  if (!composition) {
    throw new PlaybackError("No composition provided");
  }
  if (!composition.tracks || composition.tracks.length === 0) {
    throw new PlaybackError("Composition has no tracks");
  }
  if (!composition.tracks.some((track) => track.notes && track.notes.length > 0)) {
    throw new PlaybackError("Composition has no notes to play");
  }
};

const createTrackSynth = (): Tone.PolySynth => {
  const synth = new Tone.PolySynth(Tone.Synth, {
    envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 },
  }).toDestination();
  synth.volume.value = -6;
  return synth;
};

const scheduleTrackNotes = (
  notes: Note[],
  synth: Tone.PolySynth,
  tempo: number,
  snapOptions?: SnapOptions,
  trackName?: string
): Tone.Part => {
  const notesForTone = normalizeAndSortNotes(notes, snapOptions, trackName).map((note) => ({
    time: beatsToSeconds(note.time, tempo),
    note: Tone.Frequency(note.midi, "midi").toNote(),
    duration: beatsToSeconds(note.duration, tempo),
    velocity: note.velocity,
  }));

  return new Tone.Part((time, value) => {
    synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
  }, notesForTone).start(0);
};

export const playComposition = async (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Promise<void> => {
  validateForPlayback(composition);

  try {
    await Tone.start();
  } catch {
    throw new PlaybackError("Failed to start audio context. Click to enable audio.");
  }

  stopPlayback();

  const tempo = normalizeTempo(composition.tempo);
  const timeSig = normalizeTimeSignature(composition.timeSignature);

  Tone.Transport.bpm.value = tempo;
  Tone.Transport.timeSignature = timeSig;

  composition.tracks.forEach((track) => {
    if (!track.notes || track.notes.length === 0) return;

    const synth = createTrackSynth();
    synths.push(synth);

    const part = scheduleTrackNotes(track.notes, synth, tempo, snapOptions, track.name);
    parts.push(part);
  });

  Tone.Transport.start();
};

export const getTransportBeatPosition = (tempo: number): number => {
  const safeTempo = normalizeTempo(tempo);
  const seconds = Tone.Transport.seconds;

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return seconds / (60 / safeTempo);
};
