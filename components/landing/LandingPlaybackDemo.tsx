"use client";

import React from "react";
import { Download, Play, Square } from "lucide-react";
import type { MidiComposition } from "@/types";
import { buildMidiDownloadFilename } from "@/utils/downloadFilename";
import {
  PlaybackError,
  generateMidiBlob,
  getTransportBeatPosition,
  playComposition,
  stopPlayback,
} from "@/utils/midiUtils";
import PianoRoll from "@/components/PianoRoll";
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

  const noteCount = composition.tracks.reduce((total, track) => total + track.notes.length, 0);

  return (
    <div className="overflow-hidden rounded-lg border border-surface-600 bg-surface-800 shadow-2xl">
      <div className="flex items-center justify-between border-b border-surface-600 px-4 py-3 sm:px-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-muted">Demo Playback</p>
          <h3 className="text-lg font-medium text-text-primary">{composition.title}</h3>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <div className="grid grid-cols-2 gap-3 text-xs font-mono sm:grid-cols-5">
          <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
            <p className="text-text-muted uppercase tracking-wider">Key</p>
            <p className="mt-1 text-text-secondary">{composition.key}</p>
          </div>
          <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
            <p className="text-text-muted uppercase tracking-wider">Tempo</p>
            <p className="mt-1 text-text-secondary">{composition.tempo} BPM</p>
          </div>
          <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
            <p className="text-text-muted uppercase tracking-wider">Time</p>
            <p className="mt-1 text-text-secondary">{composition.timeSignature.join("/")}</p>
          </div>
          <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
            <p className="text-text-muted uppercase tracking-wider">Tracks</p>
            <p className="mt-1 text-text-secondary">{composition.tracks.length}</p>
          </div>
          <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
            <p className="text-text-muted uppercase tracking-wider">Notes</p>
            <p className="mt-1 text-text-secondary">{noteCount}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={isPlaying ? handleStop : handlePlay}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium transition-colors ${
              isPlaying
                ? "bg-accent/15 text-accent"
                : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
            }`}
          >
            {isPlaying ? <Square size={13} /> : <Play size={13} />}
            {isPlaying ? "Stop" : "Play"}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={downloadFilename}
              className="inline-flex items-center gap-1.5 rounded bg-surface-700 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
            >
              <Download size={13} />
              Download MIDI
            </a>
          )}

          <span className="ml-auto text-xs font-mono text-text-muted">
            {isPlaying ? `Beat ${Math.max(0, currentBeat).toFixed(2)}` : "Stopped"}
          </span>
        </div>

        {playbackError && (
          <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Playback error: {playbackError}
          </p>
        )}

        <PianoRoll composition={composition} currentBeat={currentBeat} isPlaying={isPlaying} height={360} />
      </div>
    </div>
  );
};

export default LandingPlaybackDemo;
