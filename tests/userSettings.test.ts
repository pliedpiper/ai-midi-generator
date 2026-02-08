import { describe, expect, it } from 'vitest';
import { validateOpenRouterApiKey } from '../lib/userSettings';

describe('validateOpenRouterApiKey', () => {
  it('accepts valid OpenRouter key format', () => {
    const result = validateOpenRouterApiKey('sk-or-abc123');
    expect(result.valid).toBe(true);
  });

  it('rejects non-string input', () => {
    const result = validateOpenRouterApiKey(1234);
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('string');
    }
  });

  it('rejects invalid prefixes', () => {
    const result = validateOpenRouterApiKey('sk-live-abc123');
    expect(result.valid).toBe(false);
    if (result.valid === false) {
      expect(result.error).toContain('sk-or-');
    }
  });
});
