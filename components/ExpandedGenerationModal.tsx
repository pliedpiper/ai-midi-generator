"use client";

import React from 'react';
import { Download } from 'lucide-react';
import type { MidiComposition, SavedGeneration } from '@/types';
import CompositionPlaybackDetails from './CompositionPlaybackDetails';
import OverlayModal from './OverlayModal';

type ExpandedGeneration = SavedGeneration & { composition: MidiComposition };

interface ExpandedGenerationModalProps {
  generation: ExpandedGeneration | null;
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
  if (!isOpen || !generation) {
    return null;
  }

  const composition = generation.composition;

  return (
    <OverlayModal
      isOpen={isOpen}
      ariaLabel={generation.title || 'Expanded generation'}
      overlayAriaLabel="Close expanded generation"
      title={generation.title || 'Untitled'}
      eyebrow={`Attempt #${generation.attempt_index}`}
      onClose={onClose}
    >
      <CompositionPlaybackDetails
        composition={composition}
        isPlaying={isPlaying}
        currentBeat={currentBeat}
        onPlay={onPlay}
        onStop={onStop}
        extraStats={[
          {
            label: 'Model',
            value: generation.model
          }
        ]}
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

export default ExpandedGenerationModal;
