import { describe, expect, it } from 'vitest';
import {
  buildFallbackGenerationTitle,
  finalizeGenerationTitle,
  isHighQualityGenerationTitle,
  sanitizeGenerationTitle
} from '../utils/titleUtils';

describe('titleUtils', () => {
  describe('sanitizeGenerationTitle', () => {
    it('removes variation markers and hash-like suffixes', () => {
      const sanitized = sanitizeGenerationTitle('Country Love Loop Var 4-pd2a49r');
      expect(sanitized).toBe('Country Love Loop');
    });

    it('removes attempt and id markers', () => {
      const sanitized = sanitizeGenerationTitle('Attempt #3: Night Drive ID abc123');
      expect(sanitized).toBe('Night Drive');
    });
  });

  describe('isHighQualityGenerationTitle', () => {
    it('rejects generic placeholders', () => {
      expect(isHighQualityGenerationTitle('Untitled')).toBe(false);
    });

    it('accepts clean human-readable titles', () => {
      expect(isHighQualityGenerationTitle('Country Love Ballad Loop')).toBe(true);
    });
  });

  describe('buildFallbackGenerationTitle', () => {
    it('builds deterministic fallback with attempt number', () => {
      const fallback = buildFallbackGenerationTitle(
        'slow-tempo country love ballad for a seamless loop',
        4
      );
      expect(fallback).toBe('Slow Tempo Country Love Ballad - Take 4');
    });

    it('uses generated composition when prompt is empty', () => {
      const fallback = buildFallbackGenerationTitle('   ', 2);
      expect(fallback).toBe('Generated Composition - Take 2');
    });
  });

  describe('finalizeGenerationTitle', () => {
    it('keeps clean model titles', () => {
      const title = finalizeGenerationTitle({
        modelTitle: 'Country Love Ballad Loop',
        prompt: 'slow-tempo country love ballad',
        attemptIndex: 1
      });
      expect(title).toBe('Country Love Ballad Loop');
    });

    it('falls back when model title is low quality', () => {
      const title = finalizeGenerationTitle({
        modelTitle: 'Var 4-pd2a49r',
        prompt: 'slow-tempo country love ballad for a seamless loop',
        attemptIndex: 4
      });
      expect(title).toBe('Slow Tempo Country Love Ballad - Take 4');
    });
  });
});
