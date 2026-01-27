import { AVAILABLE_MODELS, MIDI_LIMITS, SCALE_TYPES } from '@/constants';
import type { MidiComposition, UserPreferences, Note, Track } from '@/types';
import { clampNumber } from './midiUtils';

// Validation result types for better type narrowing
export type ValidationError = { valid: false; error: string };
export type PrefsValidationSuccess = { valid: true; normalized: UserPreferences };
export type CompositionValidationSuccess = { valid: true; composition: MidiComposition };

export type PrefsValidationResult = ValidationError | PrefsValidationSuccess;
export type CompositionValidationResult = ValidationError | CompositionValidationSuccess;

// Allowlist of valid model IDs
const ALLOWED_MODEL_IDS = new Set(AVAILABLE_MODELS.map(m => m.id));

// Import validation constants from centralized location
const {
  MIN_TEMPO,
  MAX_TEMPO,
  DEFAULT_TEMPO,
  MIN_BARS,
  MAX_BARS,
  DEFAULT_BARS,
  MIN_ATTEMPTS,
  MAX_ATTEMPTS,
  DEFAULT_PROGRAM_NUMBER,
} = MIDI_LIMITS;

// Size limits to prevent abuse
const MAX_PROMPT_LENGTH = 2000;
const MAX_CONSTRAINTS_LENGTH = 500;
const MAX_TRACKS = 16;
const MAX_NOTES_PER_TRACK = 1000;
const MAX_TOTAL_NOTES = 5000;

export const extractJson = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Empty response from OpenRouter');
  const withoutFences = trimmed
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response');
  }
  return withoutFences.slice(start, end + 1);
};

// Validate and normalize preferences
export const validatePrefs = (prefs: unknown): PrefsValidationResult => {
  if (!prefs || typeof prefs !== 'object') {
    return { valid: false, error: 'prefs must be an object' };
  }

  const p = prefs as Record<string, unknown>;

  // Required: prompt must be non-empty string within size limit
  if (typeof p.prompt !== 'string' || !p.prompt.trim()) {
    return { valid: false, error: 'prompt is required and must be a non-empty string' };
  }
  if (p.prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `prompt must be ${MAX_PROMPT_LENGTH} characters or less` };
  }

  // Required: model must be in allowlist
  if (typeof p.model !== 'string' || !ALLOWED_MODEL_IDS.has(p.model)) {
    return { valid: false, error: `model must be one of: ${Array.from(ALLOWED_MODEL_IDS).join(', ')}` };
  }

  // Normalize tempo with clamping
  const tempo = clampNumber(p.tempo, MIN_TEMPO, MAX_TEMPO, DEFAULT_TEMPO);

  // Normalize key (default to C Major if missing/invalid)
  const key = typeof p.key === 'string' && p.key.trim() ? p.key.trim() : 'C Major';

  // Normalize time signature (default to 4/4)
  let timeSignature = '4/4';
  if (typeof p.timeSignature === 'string' && /^\d+\/\d+$/.test(p.timeSignature.trim())) {
    timeSignature = p.timeSignature.trim();
  }

  // Normalize duration bars with clamping
  const durationBars = clampNumber(p.durationBars, MIN_BARS, MAX_BARS, DEFAULT_BARS);

  // Normalize constraints (allow empty, but limit length)
  let constraints = '';
  if (typeof p.constraints === 'string') {
    if (p.constraints.length > MAX_CONSTRAINTS_LENGTH) {
      return { valid: false, error: `constraints must be ${MAX_CONSTRAINTS_LENGTH} characters or less` };
    }
    constraints = p.constraints;
  }

  // Normalize attempt count with clamping
  const attemptCount = clampNumber(p.attemptCount, MIN_ATTEMPTS, MAX_ATTEMPTS, MIN_ATTEMPTS);

  // Normalize scale root (0-11)
  const scaleRoot = typeof p.scaleRoot === 'number' && Number.isFinite(p.scaleRoot)
    ? Math.max(0, Math.min(11, Math.round(p.scaleRoot))) : 0;

  // Normalize scale type
  const validScaleTypes = Object.keys(SCALE_TYPES);
  const scaleType = typeof p.scaleType === 'string' && validScaleTypes.includes(p.scaleType)
    ? p.scaleType : 'major';

  return {
    valid: true,
    normalized: {
      prompt: p.prompt.trim(),
      model: p.model,
      tempo,
      key,
      timeSignature,
      durationBars,
      constraints,
      attemptCount,
      scaleRoot,
      scaleType
    }
  };
};

// Validate a single note object
const isValidNote = (note: unknown): note is Note => {
  if (!note || typeof note !== 'object') return false;
  const n = note as Record<string, unknown>;
  return (
    typeof n.midi === 'number' &&
    typeof n.time === 'number' &&
    typeof n.duration === 'number'
  );
};

// Validate a single track object
const isValidTrack = (track: unknown): track is Track => {
  if (!track || typeof track !== 'object') return false;
  const t = track as Record<string, unknown>;
  return (
    typeof t.name === 'string' &&
    Array.isArray(t.notes) &&
    t.notes.every(isValidNote)
  );
};

// Validate model output against expected schema
export const validateComposition = (data: unknown): CompositionValidationResult => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Model output is not an object' };
  }

  const d = data as Record<string, unknown>;

  // Required string fields
  if (typeof d.title !== 'string') {
    return { valid: false, error: 'Missing or invalid title' };
  }
  if (typeof d.key !== 'string') {
    return { valid: false, error: 'Missing or invalid key' };
  }

  // Tempo: must be a finite number
  if (typeof d.tempo !== 'number' || !Number.isFinite(d.tempo) || d.tempo <= 0) {
    return { valid: false, error: 'Invalid tempo: must be a positive finite number' };
  }

  // Time signature: must be array of 2 positive integers
  if (!Array.isArray(d.timeSignature) || d.timeSignature.length !== 2 ||
      typeof d.timeSignature[0] !== 'number' || typeof d.timeSignature[1] !== 'number' ||
      !Number.isInteger(d.timeSignature[0]) || !Number.isInteger(d.timeSignature[1]) ||
      d.timeSignature[0] <= 0 || d.timeSignature[1] <= 0) {
    return { valid: false, error: 'Invalid timeSignature: must be [numerator, denominator] with positive integers' };
  }

  // Tracks: must be non-empty array within size limits
  if (!Array.isArray(d.tracks) || d.tracks.length === 0) {
    return { valid: false, error: 'tracks must be a non-empty array' };
  }
  if (d.tracks.length > MAX_TRACKS) {
    return { valid: false, error: `Too many tracks (max ${MAX_TRACKS})` };
  }

  if (!d.tracks.every(isValidTrack)) {
    return { valid: false, error: 'One or more tracks have invalid structure' };
  }

  // Check note counts to prevent memory issues
  let totalNotes = 0;
  for (const track of d.tracks as Track[]) {
    if (track.notes.length > MAX_NOTES_PER_TRACK) {
      return { valid: false, error: `Track "${track.name}" has too many notes (max ${MAX_NOTES_PER_TRACK})` };
    }
    totalNotes += track.notes.length;
  }
  if (totalNotes > MAX_TOTAL_NOTES) {
    return { valid: false, error: `Too many total notes (max ${MAX_TOTAL_NOTES})` };
  }

  // Normalize tracks - ensure programNumber exists and is valid
  const normalizedTracks: Track[] = (d.tracks as Track[]).map(track => ({
    name: track.name,
    programNumber: typeof track.programNumber === 'number' &&
                   Number.isFinite(track.programNumber) &&
                   track.programNumber >= 0 && track.programNumber <= 127
      ? Math.round(track.programNumber)
      : DEFAULT_PROGRAM_NUMBER,
    notes: track.notes
  }));

  return {
    valid: true,
    composition: {
      title: d.title,
      tempo: d.tempo,
      timeSignature: d.timeSignature as number[],
      key: d.key,
      tracks: normalizedTracks
    }
  };
};
