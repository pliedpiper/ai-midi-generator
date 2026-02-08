"use client";

import React from 'react';
import { Download, Play, Square, X } from 'lucide-react';
import type { SavedGeneration } from '@/types';
import PianoRoll from './PianoRoll';

interface ExpandedGenerationModalProps {
  generation: SavedGeneration | null;
  isOpen: boolean;
  isPlaying: boolean;
  currentBeat: number;
  onClose: () => void;
  onPlay: () => void;
  onStop: () => void;
  onDownload: () => void;
}

const ExpandedGenerationModal: React.FC<ExpandedGenerationModalProps> = ({
  generation,
  isOpen,
  isPlaying,
  currentBeat,
  onClose,
  onPlay,
  onStop,
  onDownload
}) => {
  React.useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !generation) {
    return null;
  }

  const composition = generation.composition;
  const noteCount = composition.tracks.reduce(
    (total, track) => total + (track.notes?.length ?? 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close expanded generation"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="relative z-10 flex h-full w-full items-end justify-center p-4 sm:items-center sm:p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={generation.title || 'Expanded generation'}
          className="w-full max-w-6xl overflow-hidden rounded-lg border border-surface-600 bg-surface-800 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-surface-600 px-4 py-3 sm:px-6">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-text-muted">
                Attempt #{generation.attempt_index}
              </p>
              <h3 className="text-lg font-medium text-text-primary">
                {generation.title || 'Untitled'}
              </h3>
            </div>

            <button
              onClick={onClose}
              className="rounded border border-surface-600 p-2 text-text-secondary transition-colors hover:border-surface-500 hover:text-text-primary"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          <div className="max-h-[82vh] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div className="mb-4 grid grid-cols-2 gap-3 text-xs font-mono sm:grid-cols-6">
              <div className="rounded border border-surface-600 bg-surface-900 px-3 py-2">
                <p className="text-text-muted uppercase tracking-wider">Model</p>
                <p className="mt-1 text-text-secondary truncate">{generation.model}</p>
              </div>
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
                <p className="mt-1 text-text-secondary">{composition.timeSignature.join('/')}</p>
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

            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                onClick={isPlaying ? onStop : onPlay}
                className={`inline-flex items-center gap-1.5 rounded px-3 py-2 text-xs font-medium transition-colors ${
                  isPlaying
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
                }`}
              >
                {isPlaying ? <Square size={13} /> : <Play size={13} />}
                {isPlaying ? 'Stop' : 'Play'}
              </button>

              <button
                type="button"
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 rounded bg-surface-700 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
              >
                <Download size={13} />
                Download MIDI
              </button>

              <span className="ml-auto text-xs font-mono text-text-muted">
                {isPlaying ? `Beat ${Math.max(0, currentBeat).toFixed(2)}` : 'Stopped'}
              </span>
            </div>

            <PianoRoll
              composition={composition}
              currentBeat={currentBeat}
              isPlaying={isPlaying}
              height={360}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedGenerationModal;
