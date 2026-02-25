"use client";

import React from 'react';
import { AttemptResult } from '../types';
import { Play, Square, Download, AlertCircle, Check, Loader2, Expand } from 'lucide-react';
import { buildMidiDownloadFilename } from '../utils/downloadFilename';

interface Props {
  attempt: AttemptResult;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onExpand: () => void;
}

const AttemptCard: React.FC<Props> = ({ attempt, isPlaying, onPlay, onStop, onExpand }) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const canExpand = attempt.status === 'success' && Boolean(attempt.data);
  const downloadFilename = buildMidiDownloadFilename({
    title: attempt.data?.title,
    key: attempt.data?.key,
    tempo: attempt.data?.tempo,
    fallbackTitle: `attempt-${attempt.id}`
  });

  React.useEffect(() => {
    if (attempt.midiBlob) {
      const url = URL.createObjectURL(attempt.midiBlob);
      setDownloadUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [attempt.midiBlob]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      onStop();
    } else if (attempt.data) {
      onPlay();
    }
  };

  const handleCardClick = () => {
    if (canExpand) {
      onExpand();
    }
  };

  return (
    <div
      className={`group flex h-full min-h-[16rem] flex-col rounded-2xl border border-surface-600/70 bg-surface-800/70 shadow-[0_18px_40px_-30px_rgba(0,0,0,0.85)] backdrop-blur-sm transition-colors ${
        canExpand ? 'cursor-pointer hover:border-surface-500' : ''
      }`}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (!canExpand) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onExpand();
        }
      }}
      role={canExpand ? 'button' : undefined}
      tabIndex={canExpand ? 0 : undefined}
      aria-label={canExpand ? `Open expanded output ${attempt.id}` : undefined}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-700/80 px-4 py-3">
        <span className="font-mono text-xs text-text-muted uppercase tracking-wider">
          #{attempt.id}
        </span>
        <div className="flex items-center">
          {attempt.status === 'success' && (
            <Check size={14} className="text-green-500" />
          )}
          {attempt.status === 'failed' && (
            <AlertCircle size={14} className="text-red-400" />
          )}
          {attempt.status === 'pending' && (
            <Loader2 size={14} className="animate-spin text-text-muted" />
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {attempt.status === 'success' && attempt.data ? (
          <>
            {/* Title */}
            <h4 className="mb-3 line-clamp-2 text-sm font-medium text-text-primary">
              {attempt.data.title || 'Untitled'}
            </h4>

            {/* Metadata */}
            <div className="mb-4 space-y-1.5">
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-text-muted uppercase tracking-wider">Key</span>
                <span className="text-text-secondary">{attempt.data.key}</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-text-muted uppercase tracking-wider">Tempo</span>
                <span className="text-text-secondary">{attempt.data.tempo}</span>
              </div>
              <div className="flex justify-between font-mono text-[10px]">
                <span className="text-text-muted uppercase tracking-wider">Time</span>
                <span className="text-text-secondary">{attempt.data.timeSignature.join('/')}</span>
              </div>
            </div>

            <div className="flex-1" />

            {/* Actions */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handlePlayToggle();
                }}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors ${
                  isPlaying
                    ? 'bg-accent/15 text-accent'
                    : 'bg-surface-700 text-text-secondary hover:text-text-primary hover:bg-surface-600'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square size={12} />
                    Stop
                  </>
                ) : (
                  <>
                    <Play size={12} />
                    Play
                  </>
                )}
              </button>

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={downloadFilename}
                  onClick={(event) => event.stopPropagation()}
                  className="flex w-9 items-center justify-center rounded-xl bg-surface-700 text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
                  title="Download"
                >
                  <Download size={14} />
                </a>
              )}

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  onExpand();
                }}
                className="flex w-9 items-center justify-center rounded-xl bg-surface-700 text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
                title="Expand"
                aria-label={`Expand output ${attempt.id}`}
              >
                <Expand size={14} />
              </button>
            </div>
          </>
        ) : attempt.status === 'failed' ? (
          <p className="text-sm text-red-400 font-light">
            {attempt.error || "Generation failed"}
          </p>
        ) : (
          <p className="text-sm text-text-muted font-light italic">
            Composing...
          </p>
        )}
      </div>
    </div>
  );
};

export default AttemptCard;
