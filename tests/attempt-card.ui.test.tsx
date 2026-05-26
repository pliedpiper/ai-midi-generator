// @vitest-environment jsdom

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AttemptCard from '@/components/AttemptCard';
import type { AttemptResult } from '@/types';

const successfulAttempt: AttemptResult = {
  id: 1,
  status: 'success',
  data: {
    title: 'Liminal Drift',
    tempo: 60,
    timeSignature: [4, 4],
    key: 'B minor',
    tracks: [
      {
        name: 'Piano',
        programNumber: 0,
        notes: [
          { midi: 59, time: 0, duration: 1, velocity: 0.8 },
          { midi: 62, time: 6, duration: 2, velocity: 0.8 }
        ]
      }
    ]
  }
};

describe('AttemptCard', () => {
  it('shows the generated track length in the metadata area', () => {
    render(
      <AttemptCard
        attempt={successfulAttempt}
        isPlaying={false}
        onPlay={vi.fn()}
        onStop={vi.fn()}
        onDownload={vi.fn()}
        onExpand={vi.fn()}
      />
    );

    expect(screen.getByText('Length')).toBeTruthy();
    expect(screen.getByText('0:08')).toBeTruthy();
  });
});
