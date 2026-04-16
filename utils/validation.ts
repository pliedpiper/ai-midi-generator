import { AVAILABLE_MODELS, MIDI_LIMITS, SCALE_TYPES } from '@/constants';
import {
  DEFAULT_GENERATION_STYLE_ID,
  GENERATION_STYLES,
} from '@/lib/generationStyles';
import type { MidiComposition, UserPreferences, Note, Track } from '@/types';
import { clampNumber } from './midiUtils';

export type ValidationError = { valid: false; error: string };
export type PrefsValidationSuccess = { valid: true; normalized: UserPreferences };
export type CompositionValidationSuccess = { valid: true; composition: MidiComposition };

export type PrefsValidationResult = ValidationError | PrefsValidationSuccess;
export type CompositionValidationResult = ValidationError | CompositionValidationSuccess;

const ALLOWED_MODEL_IDS = new Set(AVAILABLE_MODELS.map((model) => model.id));
const ALLOWED_STYLE_IDS = new Set(GENERATION_STYLES.map((style) => style.id));

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

const MAX_PROMPT_LENGTH = 2000;
const MAX_CONSTRAINTS_LENGTH = 500;
const MAX_TRACKS = 16;
const MAX_NOTES_PER_TRACK = 1000;
const MAX_TOTAL_NOTES = 5000;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isFinitePositiveNumber = (value: unknown): value is number =>
  isFiniteNumber(value) && value > 0;

const isValidTimeSignatureValue = (value: unknown): value is number =>
  isFiniteNumber(value) && Number.isInteger(value) && value > 0;

const isValidTimeSignature = (value: unknown): value is [number, number] => {
  if (!Array.isArray(value) || value.length !== 2) {
    return false;
  }

  return isValidTimeSignatureValue(value[0]) && isValidTimeSignatureValue(value[1]);
};

const isValidNoteStructure = (note: unknown): note is Note => {
  if (!note || typeof note !== 'object') {
    return false;
  }

  const candidate = note as Record<string, unknown>;
  return (
    typeof candidate.midi === 'number' &&
    typeof candidate.time === 'number' &&
    typeof candidate.duration === 'number'
  );
};

const hasTrackStructure = (track: unknown): track is Track => {
  if (!track || typeof track !== 'object') {
    return false;
  }

  const candidate = track as Record<string, unknown>;
  if (typeof candidate.name !== 'string' || !Array.isArray(candidate.notes)) {
    return false;
  }

  return candidate.notes.every(isValidNoteStructure);
};

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

export const validatePrefs = (prefs: unknown): PrefsValidationResult => {
  if (!prefs || typeof prefs !== 'object') {
    return { valid: false, error: 'prefs must be an object' };
  }

  const candidate = prefs as Record<string, unknown>;

  if (typeof candidate.prompt !== 'string' || !candidate.prompt.trim()) {
    return { valid: false, error: 'prompt is required and must be a non-empty string' };
  }
  if (candidate.prompt.length > MAX_PROMPT_LENGTH) {
    return { valid: false, error: `prompt must be ${MAX_PROMPT_LENGTH} characters or less` };
  }

  if (typeof candidate.model !== 'string' || !ALLOWED_MODEL_IDS.has(candidate.model)) {
    return {
      valid: false,
      error: `model must be one of: ${Array.from(ALLOWED_MODEL_IDS).join(', ')}`,
    };
  }

  const tempo = clampNumber(candidate.tempo, MIN_TEMPO, MAX_TEMPO, DEFAULT_TEMPO);
  const styleId =
    typeof candidate.styleId === 'string' && ALLOWED_STYLE_IDS.has(candidate.styleId)
      ? candidate.styleId
      : DEFAULT_GENERATION_STYLE_ID;
  const key =
    typeof candidate.key === 'string' && candidate.key.trim()
      ? candidate.key.trim()
      : 'C Major';

  let timeSignature = '4/4';
  if (
    typeof candidate.timeSignature === 'string' &&
    /^\d+\/\d+$/.test(candidate.timeSignature.trim())
  ) {
    timeSignature = candidate.timeSignature.trim();
  }

  const durationBars = clampNumber(candidate.durationBars, MIN_BARS, MAX_BARS, DEFAULT_BARS);

  let constraints = '';
  if (typeof candidate.constraints === 'string') {
    if (candidate.constraints.length > MAX_CONSTRAINTS_LENGTH) {
      return {
        valid: false,
        error: `constraints must be ${MAX_CONSTRAINTS_LENGTH} characters or less`,
      };
    }
    constraints = candidate.constraints;
  }

  const attemptCount = clampNumber(
    candidate.attemptCount,
    MIN_ATTEMPTS,
    MAX_ATTEMPTS,
    MIN_ATTEMPTS
  );

  const scaleRoot = isFiniteNumber(candidate.scaleRoot)
    ? Math.max(0, Math.min(11, Math.round(candidate.scaleRoot)))
    : 0;

  const validScaleTypes = Object.keys(SCALE_TYPES);
  const scaleType =
    typeof candidate.scaleType === 'string' && validScaleTypes.includes(candidate.scaleType)
      ? candidate.scaleType
      : 'major';

  return {
    valid: true,
    normalized: {
      prompt: candidate.prompt.trim(),
      model: candidate.model,
      styleId,
      tempo,
      key,
      timeSignature,
      durationBars,
      constraints,
      attemptCount,
      scaleRoot,
      scaleType,
    },
  };
};

export const validateComposition = (data: unknown): CompositionValidationResult => {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Model output is not an object' };
  }

  const candidate = data as Record<string, unknown>;

  if (typeof candidate.title !== 'string') {
    return { valid: false, error: 'Missing or invalid title' };
  }
  if (typeof candidate.key !== 'string') {
    return { valid: false, error: 'Missing or invalid key' };
  }

  if (!isFinitePositiveNumber(candidate.tempo)) {
    return { valid: false, error: 'Invalid tempo: must be a positive finite number' };
  }

  if (!isValidTimeSignature(candidate.timeSignature)) {
    return {
      valid: false,
      error: 'Invalid timeSignature: must be [numerator, denominator] with positive integers',
    };
  }

  if (!Array.isArray(candidate.tracks) || candidate.tracks.length === 0) {
    return { valid: false, error: 'tracks must be a non-empty array' };
  }
  if (candidate.tracks.length > MAX_TRACKS) {
    return { valid: false, error: `Too many tracks (max ${MAX_TRACKS})` };
  }

  if (!candidate.tracks.every(hasTrackStructure)) {
    return { valid: false, error: 'One or more tracks have invalid structure' };
  }

  let totalNotes = 0;
  for (const track of candidate.tracks) {
    if (track.notes.length > MAX_NOTES_PER_TRACK) {
      return {
        valid: false,
        error: `Track "${track.name}" has too many notes (max ${MAX_NOTES_PER_TRACK})`,
      };
    }
    totalNotes += track.notes.length;
  }

  if (totalNotes > MAX_TOTAL_NOTES) {
    return { valid: false, error: `Too many total notes (max ${MAX_TOTAL_NOTES})` };
  }

  const normalizedTracks: Track[] = candidate.tracks.map((track) => ({
    name: track.name,
    programNumber:
      isFiniteNumber(track.programNumber) && track.programNumber >= 0 && track.programNumber <= 127
        ? Math.round(track.programNumber)
        : DEFAULT_PROGRAM_NUMBER,
    notes: track.notes,
  }));

  return {
    valid: true,
    composition: {
      title: candidate.title,
      tempo: candidate.tempo,
      timeSignature: candidate.timeSignature,
      key: candidate.key,
      tracks: normalizedTracks,
    },
  };
};
