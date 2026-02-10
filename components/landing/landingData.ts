import { Music, Cpu, Download, Layers, Sparkles, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MidiComposition, Note } from '@/types';

export interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const FEATURES: Feature[] = [
  {
    title: 'Natural Language Prompts',
    description: 'Describe the music you hear in your head — genre, mood, structure — and let AI translate it into MIDI.',
    icon: Music,
  },
  {
    title: '30+ AI Models',
    description: 'Choose from GPT, Claude, Gemini, Mistral, DeepSeek, and more. Each model brings its own creative voice.',
    icon: Cpu,
  },
  {
    title: 'Instant MIDI Export',
    description: 'Download standard MIDI files ready for your DAW. Every generation is a valid .mid file with proper tracks and timing.',
    icon: Download,
  },
  {
    title: 'Multi-Track Compositions',
    description: 'Generate up to 16 simultaneous tracks with distinct instruments, from piano and bass to strings and synths.',
    icon: Layers,
  },
  {
    title: 'AI Prompt Improver',
    description: 'Not sure how to describe what you want? The built-in prompt improver adds musical detail and structure automatically.',
    icon: Sparkles,
  },
  {
    title: 'Private & Secure',
    description: 'Your generations are saved to your account with end-to-end encryption on API keys. Nobody else can see your work.',
    icon: Shield,
  },
];

const BEATS_PER_BAR = 4;
const BAR_COUNT = 12;
const BAR_ROOTS = [52, 49, 45, 47, 44, 49, 42, 47, 52, 47, 49, 45];
const CHORD_INTERVALS_BY_BAR = [
  [0, 4, 7, 11],
  [0, 3, 7, 10],
  [0, 4, 7, 11],
  [0, 5, 7, 10],
  [0, 3, 7, 10],
  [0, 3, 7, 10],
  [0, 3, 7, 10],
  [0, 4, 7, 10],
  [0, 4, 7, 11],
  [0, 4, 7, 10],
  [0, 3, 7, 10],
  [0, 4, 7, 11],
];
const SHIMMER_STEPS = [0, 1, 2, 3];
const SHIMMER_PATTERN_A = [2, 4, 1, 2];
const SHIMMER_PATTERN_B = [1, 4, 2, 3];
const LEAD_STEPS_A = [0, 1.5, 3];
const LEAD_STEPS_B = [0.25, 1.75, 3.1];
const LEAD_PATTERN_A = [5, 2, 1];
const LEAD_PATTERN_B = [4, 2, 0];
const LEAD_VELOCITIES_A = [0.68, 0.64, 0.66];
const LEAD_VELOCITIES_B = [0.64, 0.62, 0.66];
const LEAD_DURATIONS_A = [1.8, 1.7, 1.7];
const LEAD_DURATIONS_B = [1.85, 1.7, 1.75];

const getBarChord = (barIndex: number): number[] =>
  CHORD_INTERVALS_BY_BAR[barIndex % CHORD_INTERVALS_BY_BAR.length]!;

const buildChordNotes = (): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const root = BAR_ROOTS[bar]!;
    const chordIntervals = getBarChord(bar);
    const startBeat = bar * BEATS_PER_BAR;
    const lowerVoicing = chordIntervals.map((interval) => root + 12 + interval);
    const upperVoicing = lowerVoicing.map((midi, index) => (index === 0 ? midi + 12 : midi));
    const stabs = [0, 2, 3.5];

    stabs.forEach((offset, stabIndex) => {
      const duration = stabIndex === 2 ? 0.4 : stabIndex === 1 ? 1.25 : 1.5;
      const velocityScale = stabIndex === 0 ? 1 : stabIndex === 1 ? 0.9 : 0.78;
      const voicing = stabIndex === 1 && bar % 2 === 1 ? upperVoicing : lowerVoicing;

      voicing.forEach((midi, chordToneIndex) => {
        const velocity = (0.52 + chordToneIndex * 0.06) * velocityScale;
        notes.push({
          midi,
          time: startBeat + offset,
          duration,
          velocity,
        });
      });
    });
  }

  return notes;
};

const buildBassNotes = (): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const root = BAR_ROOTS[bar]!;
    const nextRoot = BAR_ROOTS[(bar + 1) % BAR_ROOTS.length]!;
    const startBeat = bar * BEATS_PER_BAR;
    const lowRoot = root - 12;
    const fifth = lowRoot + 7;
    const octave = lowRoot + 12;
    const target = nextRoot - 12;

    notes.push({ midi: lowRoot, time: startBeat, duration: 0.95, velocity: 0.86 });
    notes.push({ midi: fifth, time: startBeat + 1, duration: 0.45, velocity: 0.78 });
    notes.push({ midi: octave, time: startBeat + 2, duration: 0.7, velocity: 0.82 });
    notes.push({ midi: fifth, time: startBeat + 3, duration: 0.35, velocity: 0.72 });
    notes.push({ midi: target, time: startBeat + 3.5, duration: 0.35, velocity: 0.74 });
  }

  return notes;
};

const buildPadNotes = (): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const root = BAR_ROOTS[bar]!;
    const chordIntervals = getBarChord(bar);
    const startBeat = bar * BEATS_PER_BAR;
    const top = root + 24 + chordIntervals[2]!;
    const middle = root + 24 + chordIntervals[1]!;

    notes.push({ midi: middle, time: startBeat, duration: 3.8, velocity: 0.34 });
    notes.push({ midi: top, time: startBeat + 0.1, duration: 3.7, velocity: 0.3 });
  }

  return notes;
};

const buildArpNotes = (): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const root = BAR_ROOTS[bar]!;
    const chordIntervals = getBarChord(bar);
    const tonePool = [
      root + 24 + chordIntervals[0]!,
      root + 24 + chordIntervals[1]!,
      root + 24 + chordIntervals[2]!,
      root + 24 + chordIntervals[3]!,
      root + 26,
    ];
    const startBeat = bar * BEATS_PER_BAR;
    const pattern = bar % 2 === 0 ? SHIMMER_PATTERN_A : SHIMMER_PATTERN_B;

    for (let stepIndex = 0; stepIndex < pattern.length; stepIndex++) {
      const toneIndex = pattern[stepIndex]!;
      const step = SHIMMER_STEPS[stepIndex]!;
      const midi = tonePool[toneIndex]!;
      const isAccent = stepIndex === 0 || stepIndex === 2;

      notes.push({
        midi,
        time: startBeat + step,
        duration: isAccent ? 1.28 : 1.16,
        velocity: isAccent ? 0.58 : 0.5,
      });
    }
  }

  return notes;
};

const buildLeadNotes = (): Note[] => {
  const notes: Note[] = [];

  for (let bar = 0; bar < BAR_COUNT; bar++) {
    const root = BAR_ROOTS[bar]!;
    const chordIntervals = getBarChord(bar);
    const startBeat = bar * BEATS_PER_BAR;
    const isA = bar % 2 === 0;
    const chordTones = chordIntervals.map((interval) => root + 24 + interval);
    const tonePool = [
      chordTones[0]!,
      chordTones[1]!,
      chordTones[2]!,
      chordTones[3]!,
      root + 19,
      root + 26,
    ];
    const motifPattern = isA ? LEAD_PATTERN_A : LEAD_PATTERN_B;
    const steps = isA ? LEAD_STEPS_A : LEAD_STEPS_B;
    const velocities = isA ? LEAD_VELOCITIES_A : LEAD_VELOCITIES_B;
    const durations = isA ? LEAD_DURATIONS_A : LEAD_DURATIONS_B;

    steps.forEach((step, idx) => {
      const octaveShift = bar >= 8 ? 1 : 0;
      const toneIndex = motifPattern[idx]!;
      const midi = tonePool[toneIndex]! + octaveShift * 12;
      notes.push({
        midi,
        time: startBeat + step * 0.5,
        duration: durations[idx]!,
        velocity: velocities[idx]!,
      });
    });

  }

  return notes;
};

export const HERO_DEMO_COMPOSITION: MidiComposition = {
  title: 'Glassroom Haze',
  tempo: 112,
  timeSignature: [4, 4],
  key: 'E major',
  tracks: [
    {
      name: 'Chord Stabs',
      programNumber: 0,
      notes: buildChordNotes(),
    },
    {
      name: 'Electric Bass',
      programNumber: 33,
      notes: buildBassNotes(),
    },
    {
      name: 'Warm Pad',
      programNumber: 89,
      notes: buildPadNotes(),
    },
    {
      name: 'Pulse Arp',
      programNumber: 81,
      notes: buildArpNotes(),
    },
    {
      name: 'Lead Hook',
      programNumber: 80,
      notes: buildLeadNotes(),
    },
  ],
};
