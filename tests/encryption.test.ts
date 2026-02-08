import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret } from '../utils/encryption';

describe('encryption utilities', () => {
  const originalSecret = process.env.OPENROUTER_KEY_ENCRYPTION_SECRET;

  beforeEach(() => {
    process.env.OPENROUTER_KEY_ENCRYPTION_SECRET = 'test-encryption-secret-12345';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.OPENROUTER_KEY_ENCRYPTION_SECRET;
      return;
    }
    process.env.OPENROUTER_KEY_ENCRYPTION_SECRET = originalSecret;
  });

  it('encrypts and decrypts a value', () => {
    const plaintext = 'sk-or-example-key';
    const encrypted = encryptSecret(plaintext);
    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('throws for malformed payloads', () => {
    expect(() => decryptSecret('not-a-valid-payload')).toThrow();
  });
});
