"use client";

import React from 'react';
import { AttemptResult } from '../types';
import { Play, Square, Download, AlertCircle, Check, Loader2 } from 'lucide-react';
import { playComposition, stopPlayback } from '../utils/midiUtils';

interface Props {
  attempt: AttemptResult;
  isPlaying: boolean;
  onPlay: (id: number) => void;
  onStop: () => void;
}

const AttemptCard: React.FC<Props> = ({ attempt, isPlaying, onPlay, onStop }) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

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
      onPlay(attempt.id);
      playComposition(attempt.data);
    }
  };

  return (
    <div className="group flex flex-col bg-surface-800 rounded border border-surface-600 hover:border-surface-500 transition-colors">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-700 flex justify-between items-center">
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
      <div className="flex-1 p-4 flex flex-col">
        {attempt.status === 'success' && attempt.data ? (
          <>
            {/* Title */}
            <h4 className="text-sm font-medium text-text-primary mb-3 line-clamp-2">
              {attempt.data.title || 'Untitled'}
            </h4>

            {/* Metadata */}
            <div className="space-y-1.5 mb-4">
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
            <div className="flex gap-2 mt-auto">
              <button
                onClick={handlePlayToggle}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-xs font-medium transition-colors ${
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
                  download={`midi_${attempt.id}.mid`}
                  className="flex items-center justify-center w-9 rounded bg-surface-700 text-text-secondary hover:text-text-primary hover:bg-surface-600 transition-colors"
                  title="Download"
                >
                  <Download size={14} />
                </a>
              )}
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
