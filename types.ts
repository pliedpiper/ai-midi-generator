export enum GenerationStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface Note {
  midi: number;
  name?: string;
  time: number; // in beats
  duration: number; // in beats
  velocity: number; // 0-1 float or 0-127 integer
}

export interface Track {
  name: string;
  programNumber: number; // MIDI program number (0-127)
  notes: Note[];
}

export interface MidiComposition {
  title: string;
  tempo: number;
  timeSignature: number[]; // [numerator, denominator]
  key: string;
  tracks: Track[];
}

export interface AttemptResult {
  id: number;
  status: 'pending' | 'success' | 'failed';
  data?: MidiComposition;
  error?: string;
  midiBlob?: Blob; // The actual binary file
}

export interface UserPreferences {
  prompt: string;
  model: string;
  tempo: number | null;
  key: string | null;
  timeSignature: string | null;
  durationBars: number | null;
  constraints: string;
  attemptCount: number;
  scaleRoot: number;      // 0-11 pitch class
  scaleType: string;      // key from SCALE_TYPES
}

export interface SnapOptions {
  scaleRoot: number;
  scaleType: string;
}

export interface SavedGeneration {
  id: string;
  title: string;
  model: string;
  attempt_index: number;
  prefs: UserPreferences;
  composition: MidiComposition | null;
  composition_key?: string | null;
  track_count?: number | null;
  duration_beats?: number | null;
  created_at: string;
}
