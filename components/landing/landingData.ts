import { Music, Cpu, Download, Layers, Sparkles, Shield } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

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

export const SCREENSHOTS = {
  pianoRoll: '/images/landing/piano-roll.png',
  generatorForm: '/images/landing/generator-form.png',
  attemptCards: '/images/landing/attempt-cards.png',
  generationsLibrary: '/images/landing/generations-library.png',
  expandedModal: '/images/landing/expanded-modal.png',
} as const;
