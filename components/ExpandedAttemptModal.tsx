"use client";

import React from 'react';
import { Download } from 'lucide-react';
import type { AttemptResult } from '../types';
import CompositionPlaybackDetails from './CompositionPlaybackDetails';
import OverlayModal from './OverlayModal';

interface ExpandedAttemptModalProps {
  attempt: AttemptResult | null;
  isOpen: boolean;
  isPlaying: boolean;
  currentBeat: number;
  onClose: () => void;
  onPlay: () => void;
  onStop: () => void;
  onDownload: () => void;
}

const ExpandedAttemptModal: React.FC<ExpandedAttemptModalProps> = ({
  attempt,
  isOpen,
  isPlaying,
  currentBeat,
  onClose,
  onPlay,
  onStop,
  onDownload
}) => {
  if (!isOpen || !attempt?.data) {
    return null;
  }

  const composition = attempt.data;

  return (
    <OverlayModal
      isOpen={isOpen}
      ariaLabel={`Expanded output ${attempt.id}`}
      overlayAriaLabel="Close expanded output"
      title={composition.title || 'Untitled'}
      eyebrow={`Output #${attempt.id}`}
      onClose={onClose}
    >
      <CompositionPlaybackDetails
        composition={composition}
        isPlaying={isPlaying}
        currentBeat={currentBeat}
        onPlay={onPlay}
        onStop={onStop}
        downloadAction={
          <button
            type="button"
            onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-xl bg-surface-700 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
          >
            <Download size={13} />
            Download MIDI
          </button>
        }
      />
    </OverlayModal>
  );
};

export default ExpandedAttemptModal;
