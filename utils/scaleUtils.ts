import { SCALE_TYPES, ScaleTypeKey } from '../constants';

/**
 * Build a Set of valid pitch classes (0-11) for a given scale root and type.
 */
export function buildScaleSet(root: number, scaleType: string): Set<number> {
  const scaleInfo = SCALE_TYPES[scaleType as ScaleTypeKey];
  if (!scaleInfo) {
    // Default to chromatic (all notes valid) if unknown scale type
    return new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  }

  const pitchClasses = new Set<number>();
  for (const interval of scaleInfo.intervals) {
    pitchClasses.add((root + interval) % 12);
  }
  return pitchClasses;
}

/**
 * Snap a MIDI note to the nearest note in the given scale.
 * Tie-break: prefer the lower pitch.
 */
export function snapToScale(midi: number, scaleRoot: number, scaleType: string): number {
  // Chromatic scale means no snapping needed
  if (scaleType === 'chromatic') {
    return midi;
  }

  const scaleSet = buildScaleSet(scaleRoot, scaleType);
  const pitchClass = midi % 12;

  // Already in scale - no change needed
  if (scaleSet.has(pitchClass)) {
    return midi;
  }

  // Search for nearest in-scale note (±1 to ±6 semitones)
  for (let offset = 1; offset <= 6; offset++) {
    const lowerPitch = (pitchClass - offset + 12) % 12;
    const upperPitch = (pitchClass + offset) % 12;

    const lowerInScale = scaleSet.has(lowerPitch);
    const upperInScale = scaleSet.has(upperPitch);

    if (lowerInScale && upperInScale) {
      // Both are valid - prefer lower (tie-break)
      return midi - offset;
    }
    if (lowerInScale) {
      return midi - offset;
    }
    if (upperInScale) {
      return midi + offset;
    }
  }

  // Shouldn't reach here for valid scales, but return original if so
  return midi;
}

/**
 * Parse a key string like "C Major" or "F# Minor" into scale root and type.
 * Returns null if parsing fails.
 */
export function parseKeyString(keyString: string): { scaleRoot: number; scaleType: ScaleTypeKey } | null {
  if (!keyString || typeof keyString !== 'string') {
    return null;
  }

  const normalized = keyString.trim().toLowerCase();

  // Map note names to pitch classes
  const noteMap: Record<string, number> = {
    'c': 0, 'c#': 1, 'db': 1,
    'd': 2, 'd#': 3, 'eb': 3,
    'e': 4, 'fb': 4, 'e#': 5,
    'f': 5, 'f#': 6, 'gb': 6,
    'g': 7, 'g#': 8, 'ab': 8,
    'a': 9, 'a#': 10, 'bb': 10,
    'b': 11, 'cb': 11, 'b#': 0
  };

  // Map scale type names to keys
  const scaleTypeMap: Record<string, ScaleTypeKey> = {
    'major': 'major',
    'maj': 'major',
    'minor': 'natural_minor',
    'min': 'natural_minor',
    'natural minor': 'natural_minor',
    'harmonic minor': 'harmonic_minor',
    'pentatonic major': 'pentatonic_major',
    'pentatonic minor': 'pentatonic_minor',
    'blues': 'blues',
    'dorian': 'dorian',
    'mixolydian': 'mixolydian',
    'chromatic': 'chromatic'
  };

  // Try to extract note and scale type
  // Patterns: "C Major", "F# Minor", "Bb Dorian", etc.
  const match = normalized.match(/^([a-g][#b]?)\s*(.*)$/);
  if (!match) {
    return null;
  }

  const [, notePart, typePart] = match;
  const scaleRoot = noteMap[notePart];

  if (scaleRoot === undefined) {
    return null;
  }

  // Default to major if no type specified
  const scaleTypeName = typePart.trim() || 'major';
  const scaleType = scaleTypeMap[scaleTypeName];

  if (!scaleType) {
    // Unknown scale type - default to major
    return { scaleRoot, scaleType: 'major' };
  }

  return { scaleRoot, scaleType };
}

/**
 * Check if a track name indicates it's a drum/percussion track.
 * Drum tracks should not have scale snapping applied.
 */
export function isDrumTrack(trackName?: string): boolean {
  if (!trackName) return false;
  const lower = trackName.toLowerCase();
  return lower.includes('drum') || lower.includes('percussion') || lower.includes('kit');
}
