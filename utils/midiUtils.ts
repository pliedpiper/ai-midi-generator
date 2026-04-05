import type { MidiComposition, SnapOptions } from "../types";
import { PlaybackError } from "./midiPlaybackError";

export {
  beatsToSeconds,
  calculateCompositionMaxBeat,
  clampMidiNote,
  clampNumber,
  normalizeNoteDuration,
  normalizeNoteTime,
  normalizeTempo,
  normalizeTimeSignature,
  normalizeVelocity,
} from "./midiMath";
export { normalizeAndSortNotes, normalizeNote } from "./midiData";
export { PlaybackError };

type PlaybackBeatMonitorInput = {
  tempo: number;
  maxBeat: number;
  onBeat: (beat: number) => void;
  onComplete: () => void;
  completionPaddingBeats?: number;
};

type MidiExportModule = typeof import("./midiExportImpl");
type MidiPlaybackModule = typeof import("./midiPlaybackImpl");

let midiExportModule: MidiExportModule | null = null;
let midiExportModulePromise: Promise<MidiExportModule> | null = null;
let midiPlaybackModule: MidiPlaybackModule | null = null;
let midiPlaybackModulePromise: Promise<MidiPlaybackModule> | null = null;

const loadMidiExportModule = async (): Promise<MidiExportModule> => {
  if (midiExportModule) {
    return midiExportModule;
  }

  midiExportModulePromise ??= import("./midiExportImpl").then((loadedModule) => {
    midiExportModule = loadedModule;
    return loadedModule;
  });

  return midiExportModulePromise;
};

const loadMidiPlaybackModule = async (): Promise<MidiPlaybackModule> => {
  if (midiPlaybackModule) {
    return midiPlaybackModule;
  }

  midiPlaybackModulePromise ??= import("./midiPlaybackImpl").then((loadedModule) => {
    midiPlaybackModule = loadedModule;
    return loadedModule;
  });

  return midiPlaybackModulePromise;
};

export const createMidiObject = async (
  composition: MidiComposition,
  snapOptions?: SnapOptions
) => {
  const loadedModule = await loadMidiExportModule();
  return loadedModule.createMidiObject(composition, snapOptions);
};

export const generateMidiBlob = async (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Promise<Blob> => {
  const loadedModule = await loadMidiExportModule();
  return loadedModule.generateMidiBlob(composition, snapOptions);
};

export const stopPlayback = () => {
  midiPlaybackModule?.stopPlayback();
};

export const playComposition = async (
  composition: MidiComposition,
  snapOptions?: SnapOptions
): Promise<void> => {
  const loadedModule = await loadMidiPlaybackModule();
  await loadedModule.playComposition(composition, snapOptions);
};

export const getTransportBeatPosition = (tempo: number): number =>
  midiPlaybackModule?.getTransportBeatPosition(tempo) ?? 0;

export const startPlaybackBeatMonitor = ({
  tempo,
  maxBeat,
  onBeat,
  onComplete,
  completionPaddingBeats = 0.05,
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
