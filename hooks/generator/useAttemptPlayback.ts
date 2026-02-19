"use client";

import React from "react";
import type { AttemptResult, UserPreferences } from "@/types";
import {
  calculateCompositionMaxBeat,
  playComposition,
  PlaybackError,
  startPlaybackBeatMonitor,
  stopPlayback,
} from "@/utils/midiUtils";
import { resolveSnapOptions } from "@/utils/snapOptions";

type UseAttemptPlaybackInput = {
  attempts: AttemptResult[];
  lastPrefs: UserPreferences | null;
};

type UseAttemptPlaybackResult = {
  playingId: number | null;
  currentBeat: number;
  playbackError: string | null;
  setPlaybackError: React.Dispatch<React.SetStateAction<string | null>>;
  handlePlay: (id: number, attempt: AttemptResult) => Promise<void>;
  handleStop: () => void;
};

export const useAttemptPlayback = ({
  attempts,
  lastPrefs,
}: UseAttemptPlaybackInput): UseAttemptPlaybackResult => {
  const [playingId, setPlayingId] = React.useState<number | null>(null);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [playbackError, setPlaybackError] = React.useState<string | null>(null);

  const handleStop = React.useCallback(() => {
    stopPlayback();
    setPlayingId(null);
    setCurrentBeat(0);
    setPlaybackError(null);
  }, []);

  const handlePlay = React.useCallback(
    async (id: number, attempt: AttemptResult) => {
      if (!attempt.data) return;

      setPlaybackError(null);

      const snapOptions = resolveSnapOptions({
        prefs: lastPrefs,
        compositionKey: attempt.data.key,
      });

      try {
        await playComposition(attempt.data, snapOptions);
        setPlayingId(id);
        setCurrentBeat(0);
      } catch (error) {
        stopPlayback();
        setPlayingId(null);
        setCurrentBeat(0);

        const message =
          error instanceof PlaybackError
            ? error.message
            : error instanceof Error
              ? error.message
              : "Playback failed";

        setPlaybackError(message);
      }
    },
    [lastPrefs]
  );

  React.useEffect(() => {
    if (playingId === null) return;
    const activeAttempt = attempts.find((attempt) => attempt.id === playingId);
    if (!activeAttempt?.data) return;

    return startPlaybackBeatMonitor({
      tempo: activeAttempt.data.tempo,
      maxBeat: calculateCompositionMaxBeat(activeAttempt.data),
      onBeat: setCurrentBeat,
      onComplete: handleStop,
    });
  }, [attempts, handleStop, playingId]);

  return {
    playingId,
    currentBeat,
    playbackError,
    setPlaybackError,
    handlePlay,
    handleStop,
  };
};
