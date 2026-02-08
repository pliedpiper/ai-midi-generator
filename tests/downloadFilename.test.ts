import { describe, expect, it } from 'vitest';
import { buildMidiDownloadFilename } from '../utils/downloadFilename';

describe('buildMidiDownloadFilename', () => {
  it('includes title, key, and tempo in the filename', () => {
    const filename = buildMidiDownloadFilename({
      title: 'Moonlight Sketch',
      key: 'D Minor',
      tempo: 92
    });

    expect(filename).toBe('moonlight-sketch_d-minor_92bpm.mid');
  });

  it('normalizes sharps and flats for safe filenames', () => {
    const filename = buildMidiDownloadFilename({
      title: 'Night Drive',
      key: 'F# Minor / Bb Major',
      tempo: 126
    });

    expect(filename).toBe('night-drive_f-sharp-minor-bb-major_126bpm.mid');
  });

  it('falls back when fields are missing or invalid', () => {
    const filename = buildMidiDownloadFilename({
      title: '   ',
      key: '',
      tempo: Number.NaN,
      fallbackTitle: 'attempt-3'
    });

    expect(filename).toBe('attempt-3_unknown-key_unknown-bpm.mid');
  });
});
