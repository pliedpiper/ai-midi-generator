"use client";

import React from 'react';
import { Play, Square } from 'lucide-react';
import type { MidiComposition } from '@/types';
import PianoRoll from './PianoRoll';

interface CompositionStat {
  label: string;
  value: React.ReactNode;
}

interface CompositionPlaybackDetailsProps {
  composition: MidiComposition;
  isPlaying: boolean;
  currentBeat: number;
  onPlay: () => void;
  onStop: () => void;
  downloadAction?: React.ReactNode;
  playbackError?: string | null;
  extraStats?: CompositionStat[];
}

const CompositionPlaybackDetails: React.FC<CompositionPlaybackDetailsProps> = ({
  composition,
  isPlaying,
  currentBeat,
  onPlay,
  onStop,
  downloadAction,
  playbackError,
  extraStats = []
}) => {
  const noteCount = composition.tracks.reduce(
    (total, track) => total + (track.notes?.length ?? 0),
    0
  );

  const stats: CompositionStat[] = [
    ...extraStats,
    { label: 'Key', value: composition.key },
    { label: 'Tempo', value: `${composition.tempo} BPM` },
    { label: 'Time', value: composition.timeSignature.join('/') },
    { label: 'Tracks', value: composition.tracks.length },
    { label: 'Notes', value: noteCount }
  ];

  const gridClassName =
    stats.length >= 6 ? 'sm:grid-cols-6' : stats.length === 5 ? 'sm:grid-cols-5' : 'sm:grid-cols-4';

  return (
    <>
      <div className={`mb-4 grid grid-cols-2 gap-3 text-xs font-mono ${gridClassName}`}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-surface-600 bg-surface-900 px-3 py-2"
          >
            <p className="text-text-muted uppercase tracking-wider">{stat.label}</p>
            <p className="mt-1 truncate text-text-secondary">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={isPlaying ? onStop : onPlay}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
            isPlaying
              ? 'bg-accent/15 text-accent'
              : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
          }`}
        >
          {isPlaying ? <Square size={13} /> : <Play size={13} />}
          {isPlaying ? 'Stop' : 'Play'}
        </button>

        {downloadAction ?? null}

        <span className="ml-auto text-xs font-mono text-text-muted">
          {isPlaying ? `Beat ${Math.max(0, currentBeat).toFixed(2)}` : 'Stopped'}
        </span>
      </div>

      {playbackError ? (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          Playback error: {playbackError}
        </p>
      ) : null}

      <PianoRoll
        composition={composition}
        currentBeat={currentBeat}
        isPlaying={isPlaying}
        height={360}
      />
    </>
  );
};

export default CompositionPlaybackDetails;
