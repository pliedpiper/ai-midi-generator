"use client";

import React from "react";
import type { SavedGeneration } from "@/types";
import {
  calculateCompositionMaxBeat,
  playComposition,
  startPlaybackBeatMonitor,
  stopPlayback,
} from "@/utils/midiUtils";
import { resolveSnapOptionsForGeneration } from "@/utils/snapOptions";

type UseGenerationsPlaybackInput = {
  generations: SavedGeneration[];
  visibleGenerations: SavedGeneration[];
  ensureCompositionLoaded: (generation: SavedGeneration) => Promise<SavedGeneration>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
};

type UseGenerationsPlaybackResult = {
  playingId: string | null;
  currentBeat: number;
  handlePlayToggle: (generation: SavedGeneration) => Promise<void>;
  handleStopPlayback: () => void;
  stopAndResetPlayback: () => void;
};

export const useGenerationsPlayback = ({
  generations,
  visibleGenerations,
  ensureCompositionLoaded,
  setError,
}: UseGenerationsPlaybackInput): UseGenerationsPlaybackResult => {
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);

  const stopAndResetPlayback = React.useCallback(() => {
    stopPlayback();
    setPlayingId(null);
    setCurrentBeat(0);
  }, []);

  const handleStopPlayback = React.useCallback(() => {
    stopAndResetPlayback();
  }, [stopAndResetPlayback]);

  const handlePlayToggle = React.useCallback(
    async (generation: SavedGeneration) => {
      if (playingId === generation.id) {
        stopAndResetPlayback();
        return;
      }

      try {
        const playableGeneration = await ensureCompositionLoaded(generation);
        if (!playableGeneration.composition) {
          throw new Error("Generation has no composition data.");
        }

        await playComposition(
          playableGeneration.composition,
          resolveSnapOptionsForGeneration(playableGeneration)
        );
        setPlayingId(playableGeneration.id);
        setCurrentBeat(0);
      } catch (playError) {
        setError(playError instanceof Error ? playError.message : "Playback failed.");
        setPlayingId(null);
        setCurrentBeat(0);
      }
    },
    [ensureCompositionLoaded, playingId, setError, stopAndResetPlayback]
  );

  React.useEffect(() => {
    if (playingId === null) return;
    const activeGeneration = generations.find((item) => item.id === playingId);
    if (!activeGeneration?.composition) return;

    return startPlaybackBeatMonitor({
      tempo: activeGeneration.composition.tempo,
      maxBeat: calculateCompositionMaxBeat(activeGeneration.composition),
      onBeat: setCurrentBeat,
      onComplete: stopAndResetPlayback,
    });
  }, [generations, playingId, stopAndResetPlayback]);

  React.useEffect(() => {
    if (playingId === null) return;
    const isVisible = visibleGenerations.some((item) => item.id === playingId);
    if (!isVisible) {
      stopAndResetPlayback();
    }
  }, [playingId, stopAndResetPlayback, visibleGenerations]);

  return {
    playingId,
    currentBeat,
    handlePlayToggle,
    handleStopPlayback,
    stopAndResetPlayback,
  };
};
