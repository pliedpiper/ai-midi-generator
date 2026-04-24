import { DEFAULT_GENERATION_STYLE_ID } from "@/lib/generationStyles";

// Validation & normalization constants 
export const MIDI_LIMITS = {
  MIN_TEMPO: 20,
  MAX_TEMPO: 300,
  DEFAULT_TEMPO: 120,
  MIN_BARS: 1,
  MAX_BARS: 64,
  DEFAULT_BARS: 8,
  MIN_ATTEMPTS: 1,
  MAX_ATTEMPTS: 5,
  MIN_MIDI_NOTE: 21,
  MAX_MIDI_NOTE: 108,
  DEFAULT_PROGRAM_NUMBER: 0,
  DRUM_CHANNEL: 9,
  MIN_DURATION: 0.001,
  DEFAULT_VELOCITY: 0.8,
} as const;

export const SCALE_ROOTS = [
  { value: 0, label: 'C' }, { value: 1, label: 'C#/Db' }, { value: 2, label: 'D' },
  { value: 3, label: 'D#/Eb' }, { value: 4, label: 'E' }, { value: 5, label: 'F' },
  { value: 6, label: 'F#/Gb' }, { value: 7, label: 'G' }, { value: 8, label: 'G#/Ab' },
  { value: 9, label: 'A' }, { value: 10, label: 'A#/Bb' }, { value: 11, label: 'B' }
] as const;

export const SCALE_TYPES = {
  major: { label: 'Major', intervals: [0, 2, 4, 5, 7, 9, 11] },
  natural_minor: { label: 'Natural Minor', intervals: [0, 2, 3, 5, 7, 8, 10] },
  harmonic_minor: { label: 'Harmonic Minor', intervals: [0, 2, 3, 5, 7, 8, 11] },
  pentatonic_major: { label: 'Pentatonic Major', intervals: [0, 2, 4, 7, 9] },
  pentatonic_minor: { label: 'Pentatonic Minor', intervals: [0, 3, 5, 7, 10] },
  blues: { label: 'Blues', intervals: [0, 3, 5, 6, 7, 10] },
  dorian: { label: 'Dorian', intervals: [0, 2, 3, 5, 7, 9, 10] },
  mixolydian: { label: 'Mixolydian', intervals: [0, 2, 4, 5, 7, 9, 10] },
  chromatic: { label: 'Chromatic (No Snap)', intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] }
} as const;

export type ScaleTypeKey = keyof typeof SCALE_TYPES;

export const DEFAULT_PREFERENCES = {
  prompt: "",
  model: "moonshotai/kimi-k2.5",
  styleId: DEFAULT_GENERATION_STYLE_ID,
  tempo: 120,
  key: "C Major",
  timeSignature: "4/4",
  durationBars: 8,
  constraints: "No Drums",
  attemptCount: 5,
  scaleRoot: 0,          // C
  scaleType: 'major' as ScaleTypeKey
};

export const AVAILABLE_MODELS = [
  { id: "arcee-ai/trinity-large-preview:free", name: "Arcee Trinity Large Preview (free)" },
  { id: "bytedance-seed/seed-1.6-flash", name: "ByteDance Seed 1.6 Flash" },
  { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  { id: "anthropic/claude-opus-4.5", name: "Claude Opus 4.5" },
  { id: "anthropic/claude-opus-4.6", name: "Claude Opus 4.6" },
  { id: "anthropic/claude-opus-4.7", name: "Claude Opus 4.7" },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5" },
  { id: "anthropic/claude-sonnet-4.6", name: "Claude Sonnet 4.6" },
  { id: "deepseek/deepseek-v3.2", name: "DeepSeek V3.2" },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash Lite" },
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
  { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash Preview" },
  { id: "google/gemini-3-pro-preview", name: "Gemini 3 Pro Preview" },
  { id: "google/gemini-3.1-pro-preview", name: "Gemini 3.1 Pro Preview" },
  { id: "z-ai/glm-5", name: "GLM 5" },
  { id: "z-ai/glm-4.7-flash", name: "GLM 4.7 Flash" },
  { id: "openai/gpt-5.4", name: "GPT-5.4" },
  { id: "openai/gpt-5.4-mini", name: "GPT-5.4 Mini" },
  { id: "openai/gpt-5.4-nano", name: "GPT-5.4 Nano" },
  { id: "openai/gpt-5.2", name: "GPT-5.2" },
  { id: "openai/gpt-5.2-chat", name: "GPT-5.2 Chat" },
  { id: "openai/gpt-5.2-codex", name: "GPT-5.2 Codex" },
  { id: "openai/gpt-oss-120b:free", name: "GPT OSS 120B (free)" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1" },
  { id: "moonshotai/kimi-k2.5", name: "Kimi K2.5" },
  { id: "mistralai/devstral-2512", name: "Mistral Devstral 2512" },
  { id: "mistralai/mistral-large-2512", name: "Mistral Large 2512" },
  { id: "mistralai/mistral-small-creative", name: "Mistral Small Creative" },
  { id: "minimax/minimax-m2.5", name: "MiniMax M2.5" },
  { id: "xiaomi/mimo-v2-flash", name: "MiMo V2 Flash" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B A3B (free)" },
  { id: "openrouter/auto", name: "OpenRouter Auto" },
  { id: "openrouter/free", name: "OpenRouter Free" },
  { id: "openrouter/hunter-alpha", name: "Hunter Alpha" },
  { id: "qwen/qwen3-coder", name: "Qwen3 Coder" },
  { id: "qwen/qwen3-coder-next", name: "Qwen3 Coder Next" },
  { id: "stepfun/step-3.5-flash:free", name: "Step 3.5 Flash (free)" }
];
