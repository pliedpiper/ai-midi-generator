import { describe, it, expect } from 'vitest';
import { extractJson, validateComposition } from '../utils/validation';

// Note: Full integration tests with mocked OpenAI require complex setup.
// These tests focus on the validation logic which is already covered in route.test.ts.
// For full integration testing, consider using a test server setup or E2E tests.

describe('API /api/generate validation functions', () => {
  describe('extractJson edge cases', () => {
    it('handles multiple JSON objects - takes outer bounds', () => {
      const input = '{"a": 1} some text {"b": 2}';
      // Should extract from first { to last }
      const result = extractJson(input);
      expect(result).toBe('{"a": 1} some text {"b": 2}');
    });

    it('handles deeply nested markdown', () => {
      const input = `
Here's the composition:

\`\`\`json
{
  "title": "Test",
  "tracks": [{"notes": []}]
}
\`\`\`

Enjoy your music!
      `;
      const result = extractJson(input);
      expect(JSON.parse(result)).toHaveProperty('title', 'Test');
    });
  });

  describe('validateComposition edge cases', () => {
    it('handles tracks with empty notes array', () => {
      const composition = {
        title: 'Test',
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{ name: 'Empty', notes: [] }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(true);
    });

    it('handles very large tempo', () => {
      const composition = {
        title: 'Test',
        tempo: 99999,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{ name: 'Track', notes: [{ midi: 60, time: 0, duration: 1 }] }]
      };
      // Large tempo is valid (clamping happens at MIDI generation, not schema validation)
      const result = validateComposition(composition);
      expect(result.valid).toBe(true);
    });

    it('rejects string tempo', () => {
      const composition = {
        title: 'Test',
        tempo: '120' as unknown as number,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{ name: 'Track', notes: [{ midi: 60, time: 0, duration: 1 }] }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(false);
    });

    it('rejects negative timeSignature values', () => {
      const composition = {
        title: 'Test',
        tempo: 120,
        timeSignature: [-4, 4],
        key: 'C Major',
        tracks: [{ name: 'Track', notes: [{ midi: 60, time: 0, duration: 1 }] }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(false);
    });

    it('handles float programNumber', () => {
      const composition = {
        title: 'Test',
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{ name: 'Track', programNumber: 10.7, notes: [{ midi: 60, time: 0, duration: 1 }] }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.composition.tracks[0].programNumber).toBe(11); // Rounded
      }
    });

    it('handles note with optional velocity', () => {
      const composition = {
        title: 'Test',
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{
          name: 'Track',
          notes: [{ midi: 60, time: 0, duration: 1 }] // No velocity
        }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(true);
    });

    it('rejects track without name', () => {
      const composition = {
        title: 'Test',
        tempo: 120,
        timeSignature: [4, 4],
        key: 'C Major',
        tracks: [{ notes: [{ midi: 60, time: 0, duration: 1 }] }]
      };
      const result = validateComposition(composition);
      expect(result.valid).toBe(false);
    });
  });
});
