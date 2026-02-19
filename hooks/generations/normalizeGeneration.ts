import type { MidiComposition, SavedGeneration } from "@/types";
import { calculateCompositionMaxBeat } from "@/utils/midiUtils";

export type GenerationPagePayload = {
  generations?: unknown;
  pagination?: {
    hasMore?: unknown;
    nextOffset?: unknown;
  };
};

export type GenerationDetailPayload = {
  generation?: unknown;
};

export type SavedGenerationWithComposition = SavedGeneration & {
  composition: MidiComposition;
};

export const hasComposition = (
  generation: SavedGeneration
): generation is SavedGenerationWithComposition => generation.composition !== null;

export const normalizeGeneration = (raw: unknown): SavedGeneration | null => {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Partial<SavedGeneration>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.title !== "string" ||
    typeof candidate.model !== "string" ||
    typeof candidate.attempt_index !== "number" ||
    !candidate.prefs ||
    typeof candidate.prefs !== "object" ||
    typeof candidate.created_at !== "string"
  ) {
    return null;
  }

  const composition =
    candidate.composition && typeof candidate.composition === "object"
      ? (candidate.composition as MidiComposition)
      : null;

  return {
    id: candidate.id,
    title: candidate.title,
    model: candidate.model,
    attempt_index: candidate.attempt_index,
    prefs: candidate.prefs as SavedGeneration["prefs"],
    composition,
    composition_key:
      typeof candidate.composition_key === "string"
        ? candidate.composition_key
        : composition?.key ?? null,
    track_count:
      typeof candidate.track_count === "number" && Number.isFinite(candidate.track_count)
        ? Math.max(0, Math.round(candidate.track_count))
        : composition
          ? composition.tracks.length
          : null,
    duration_beats:
      typeof candidate.duration_beats === "number" && Number.isFinite(candidate.duration_beats)
        ? Math.max(0, candidate.duration_beats)
        : composition
          ? calculateCompositionMaxBeat(composition)
          : null,
    created_at: candidate.created_at,
  };
};
