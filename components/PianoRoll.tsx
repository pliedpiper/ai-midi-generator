"use client";

import React from 'react';
import type { MidiComposition } from '../types';
import { buildPianoRollData } from '../utils/pianoRollUtils';

interface PianoRollProps {
  composition: MidiComposition;
  currentBeat?: number;
  isPlaying?: boolean;
  height?: number;
  className?: string;
}

type ThemeMode = 'dark' | 'light';

const BLACK_KEY_PITCH_CLASSES = new Set([1, 3, 6, 8, 10]);

const getTrackColor = (trackIndex: number): string =>
  `hsl(${(trackIndex * 67) % 360} 74% 62%)`;

const getTrackColorWithAlpha = (trackIndex: number, alpha: number): string =>
  `hsl(${(trackIndex * 67) % 360} 74% 62% / ${alpha})`;

const getThemeMode = (): ThemeMode => {
  if (typeof document === 'undefined') return 'dark';
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
};

const PianoRoll: React.FC<PianoRollProps> = ({
  composition,
  currentBeat = 0,
  isPlaying = false,
  height = 320,
  className = ''
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const baseCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const playheadCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [width, setWidth] = React.useState(0);
  const [themeMode, setThemeMode] = React.useState<ThemeMode>(() => getThemeMode());

  const data = React.useMemo(() => buildPianoRollData(composition), [composition]);

  React.useEffect(() => {
    const root = document.documentElement;
    const updateTheme = () => setThemeMode(getThemeMode());

    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setWidth(Math.max(1, Math.floor(element.clientWidth)));
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const canvas = baseCanvasRef.current;
    if (!canvas || width <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    const { notes, beatRange, pitchRange } = data;
    const totalBeats = Math.max(beatRange.totalBeats, 1);
    const pitchSpan = Math.max(pitchRange.maxMidi - pitchRange.minMidi + 1, 1);
    const noteHeight = height / pitchSpan;
    const beatsPerBar = Array.isArray(composition.timeSignature) && Number.isFinite(composition.timeSignature[0])
      ? Math.max(1, Math.round(composition.timeSignature[0]))
      : 4;

    const midiToY = (midi: number): number => (pitchRange.maxMidi - midi) * noteHeight;
    const beatToX = (beat: number): number => ((beat - beatRange.startBeat) / totalBeats) * width;
    const colors =
      themeMode === 'light'
        ? {
            blackLane: 'rgba(64, 68, 74, 0.36)',
            whiteLane: 'rgba(247, 247, 242, 0.94)',
            octaveLine: 'rgba(153, 95, 42, 0.20)',
            barLine: 'rgba(153, 95, 42, 0.28)',
            beatLine: 'rgba(76, 84, 97, 0.16)',
            noteStroke: 'rgba(24, 24, 24, 0.24)'
          }
        : {
            blackLane: 'rgba(56, 64, 74, 0.54)',
            whiteLane: 'rgba(24, 28, 34, 0.90)',
            octaveLine: 'rgba(212, 165, 116, 0.22)',
            barLine: 'rgba(212, 165, 116, 0.24)',
            beatLine: 'rgba(229, 229, 229, 0.12)',
            noteStroke: 'rgba(0, 0, 0, 0.28)'
          };

    // Background pitch lanes.
    for (let midi = pitchRange.minMidi; midi <= pitchRange.maxMidi; midi++) {
      const y = midiToY(midi);
      const isBlackKey = BLACK_KEY_PITCH_CLASSES.has(midi % 12);
      context.fillStyle = isBlackKey ? colors.blackLane : colors.whiteLane;
      context.fillRect(0, y, width, noteHeight);

      if (midi % 12 === 0) {
        context.strokeStyle = colors.octaveLine;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }
    }

    // Vertical beat and bar grid lines.
    const beatCount = Math.ceil(beatRange.endBeat);
    for (let beat = 0; beat <= beatCount; beat++) {
      const x = beatToX(beat);
      if (x < 0 || x > width) continue;

      const isBar = beat % beatsPerBar === 0;
      context.strokeStyle = isBar ? colors.barLine : colors.beatLine;
      context.lineWidth = isBar ? 1.25 : 0.75;
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }

    // Notes.
    notes.forEach((note) => {
      const x = beatToX(note.startBeat);
      const y = midiToY(note.midi) + 0.5;
      const noteWidth = Math.max((note.durationBeat / totalBeats) * width, 1.5);
      const boxHeight = Math.max(noteHeight - 1, 1);
      const alpha = 0.4 + (note.velocity * 0.5);

      context.fillStyle = getTrackColorWithAlpha(note.trackIndex, alpha);
      context.fillRect(x, y, noteWidth, boxHeight);

      context.strokeStyle = colors.noteStroke;
      context.lineWidth = 1;
      context.strokeRect(x, y, noteWidth, boxHeight);
    });

  }, [composition, data, height, themeMode, width]);

  React.useEffect(() => {
    const canvas = playheadCanvasRef.current;
    if (!canvas || width <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);

    if (!isPlaying || !Number.isFinite(currentBeat)) {
      return;
    }

    const { beatRange } = data;
    const totalBeats = Math.max(beatRange.totalBeats, 1);
    const clampedBeat = Math.max(beatRange.startBeat, Math.min(beatRange.endBeat, currentBeat));
    const x = ((clampedBeat - beatRange.startBeat) / totalBeats) * width;

    context.strokeStyle = '#d4a574';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();

    context.fillStyle = '#d4a574';
    context.beginPath();
    context.moveTo(x - 5, 0);
    context.lineTo(x + 5, 0);
    context.lineTo(x, 8);
    context.closePath();
    context.fill();
  }, [currentBeat, data, height, isPlaying, width]);

  if (data.notes.length === 0) {
    return (
      <div
        className={`flex h-44 items-center justify-center rounded border border-surface-600 bg-surface-900 text-sm text-text-muted ${className}`}
      >
        No notes to visualize.
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs font-mono text-text-muted">
        <span>
          {data.notes.length} notes
        </span>
        <span>
          {data.beatRange.totalBeats.toFixed(1)} beats
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative overflow-hidden rounded border border-surface-600 bg-surface-900"
      >
        <canvas ref={baseCanvasRef} />
        <canvas
          ref={playheadCanvasRef}
          className="pointer-events-none absolute inset-0"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {data.trackNames.map((trackName, index) => (
          <span
            key={`${trackName}-${index}`}
            className="inline-flex items-center gap-2 rounded border border-surface-600 bg-surface-800 px-2 py-1 text-[10px] text-text-secondary font-mono uppercase tracking-wide"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: getTrackColor(index) }}
            />
            {trackName}
          </span>
        ))}
      </div>
    </div>
  );
};

export default PianoRoll;
