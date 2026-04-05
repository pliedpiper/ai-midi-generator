"use client";

import React from "react";
import { Download } from "lucide-react";
import {
  PlaybackError,
  calculateCompositionMaxBeat,
  getTransportBeatPosition,
  playComposition,
  stopPlayback,
} from "@/utils/midiUtils";
import { downloadMidiComposition } from "@/utils/midiDownload";
import CompositionPlaybackDetails from "@/components/CompositionPlaybackDetails";
import { HERO_DEMO_COMPOSITION } from "./landingData";

const LandingPlaybackDemo: React.FC = () => {
  const composition = HERO_DEMO_COMPOSITION;
  const maxBeat = React.useMemo(() => calculateCompositionMaxBeat(composition), [composition]);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentBeat, setCurrentBeat] = React.useState(0);
  const [playbackError, setPlaybackError] = React.useState<string | null>(null);

  const handleStop = React.useCallback(() => {
    stopPlayback();
    setIsPlaying(false);
    setCurrentBeat(0);
  }, []);

  const handlePlay = React.useCallback(async () => {
    setPlaybackError(null);

    try {
      await playComposition(composition);
      setIsPlaying(true);
      setCurrentBeat(0);
    } catch (error) {
      stopPlayback();
      setIsPlaying(false);
      setCurrentBeat(0);

      const message =
        error instanceof PlaybackError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Playback failed";
      setPlaybackError(message);
    }
  }, [composition]);

  React.useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId = 0;
    const updateBeat = () => {
      const beat = getTransportBeatPosition(composition.tempo);
      setCurrentBeat(beat);

      if (beat >= maxBeat + 0.05) {
        handleStop();
        return;
      }

      animationFrameId = requestAnimationFrame(updateBeat);
    };

    animationFrameId = requestAnimationFrame(updateBeat);
    return () => cancelAnimationFrame(animationFrameId);
  }, [composition.tempo, handleStop, isPlaying, maxBeat]);

  React.useEffect(
    () => () => {
      stopPlayback();
    },
    []
  );

  return (
    <div className="overflow-hidden rounded-[2rem] border border-surface-600/70 bg-surface-800/70 shadow-[0_24px_60px_-35px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-surface-600/70 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">Demo Playback</p>
          <h3 className="text-lg font-medium text-text-primary">{composition.title}</h3>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <CompositionPlaybackDetails
          composition={composition}
          isPlaying={isPlaying}
          currentBeat={currentBeat}
          onPlay={handlePlay}
          onStop={handleStop}
          playbackError={playbackError}
          downloadAction={
            <button
              type="button"
              onClick={async () => {
                try {
                  await downloadMidiComposition({
                    composition,
                    fallbackTitle: "landing-demo",
                  });
                } catch (error) {
                  setPlaybackError(
                    error instanceof Error ? error.message : "Failed to download MIDI."
                  );
                }
              }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-surface-700 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
            >
              <Download size={13} />
              Download MIDI
            </button>
          }
        />
      </div>
    </div>
  );
};

export default LandingPlaybackDemo;
