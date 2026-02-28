"use client";

import React from "react";
import { Download } from "lucide-react";
import type { MidiComposition } from "@/types";
import { buildMidiDownloadFilename } from "@/utils/downloadFilename";
import {
  PlaybackError,
  generateMidiBlob,
  getTransportBeatPosition,
  playComposition,
  stopPlayback,
} from "@/utils/midiUtils";
import CompositionPlaybackDetails from "@/components/CompositionPlaybackDetails";
import { HERO_DEMO_COMPOSITION } from "./landingData";

const getMaxBeat = (composition: MidiComposition): number =>
  composition.tracks.reduce((trackMax, track) => {
    const noteMax = track.notes.reduce(
      (noteEndMax, note) => Math.max(noteEndMax, note.time + Math.max(note.duration, 0.001)),
      0
    );
    return Math.max(trackMax, noteMax);
  }, 0);

const LandingPlaybackDemo: React.FC = () => {
  const composition = HERO_DEMO_COMPOSITION;
  const maxBeat = React.useMemo(() => getMaxBeat(composition), [composition]);
  const downloadFilename = React.useMemo(
    () =>
      buildMidiDownloadFilename({
        title: composition.title,
        key: composition.key,
        tempo: composition.tempo,
        fallbackTitle: "landing-demo",
      }),
    [composition]
  );

  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
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
    if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      return;
    }

    const midiBlob = generateMidiBlob(composition);
    const url = URL.createObjectURL(midiBlob);
    setDownloadUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
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
            downloadUrl ? (
              <a
                href={downloadUrl}
                download={downloadFilename}
                className="inline-flex items-center gap-1.5 rounded-xl bg-surface-700 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
              >
                <Download size={13} />
                Download MIDI
              </a>
            ) : null
          }
        />
      </div>
    </div>
  );
};

export default LandingPlaybackDemo;
