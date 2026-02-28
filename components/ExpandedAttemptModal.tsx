"use client";

import React from 'react';
import { Download } from 'lucide-react';
import type { AttemptResult } from '../types';
import { buildMidiDownloadFilename } from '../utils/downloadFilename';
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
}

const ExpandedAttemptModal: React.FC<ExpandedAttemptModalProps> = ({
  attempt,
  isOpen,
  isPlaying,
  currentBeat,
  onClose,
  onPlay,
  onStop
}) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (attempt?.midiBlob) {
      const url = URL.createObjectURL(attempt.midiBlob);
      setDownloadUrl(url);
      return () => URL.revokeObjectURL(url);
    }

    setDownloadUrl(null);
  }, [attempt?.midiBlob]);

  if (!isOpen || !attempt?.data) {
    return null;
  }

  const composition = attempt.data;
  const downloadFilename = buildMidiDownloadFilename({
    title: composition.title,
    key: composition.key,
    tempo: composition.tempo,
    fallbackTitle: `attempt-${attempt.id}`
  });

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
    </OverlayModal>
  );
};

export default ExpandedAttemptModal;
