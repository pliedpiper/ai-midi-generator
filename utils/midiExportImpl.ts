import { Midi } from "@tonejs/midi";
import type { MidiComposition, SnapOptions } from "../types";
import { MIDI_LIMITS } from "../constants";
import { normalizeAndSortNotes } from "./midiData";
import { beatsToSeconds, normalizeTempo, normalizeTimeSignature } from "./midiMath";

const { DRUM_CHANNEL } = MIDI_LIMITS;

export const createMidiObject = (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Midi => {
  const tempo = normalizeTempo(composition.tempo);
  const [num, den] = normalizeTimeSignature(composition.timeSignature);

  const midi = new Midi();
  midi.name = composition.title || "Untitled";
  midi.header.setTempo(tempo);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den] });

  composition.tracks.forEach((trackData) => {
    const track = midi.addTrack();
    track.name = trackData.name || "Track";
    track.instrument.number = Number.isFinite(trackData.programNumber)
      ? Math.max(0, Math.min(127, Math.round(trackData.programNumber)))
      : 0;
    track.channel = trackData.name?.toLowerCase().includes("drum") ? DRUM_CHANNEL : 0;

    const normalizedNotes = normalizeAndSortNotes(
      trackData.notes,
      snapOptions,
      trackData.name
    );

    normalizedNotes.forEach((note) => {
      track.addNote({
        midi: note.midi,
        time: beatsToSeconds(note.time, tempo),
        duration: beatsToSeconds(note.duration, tempo),
        velocity: note.velocity,
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
  return new Blob([arrayBuffer as BlobPart], { type: "audio/midi" });
};
