import { describe, expect, it } from 'vitest';
import { getSafeNextPathFromSearch, sanitizeNextPath } from '@/utils/redirectPath';

describe('sanitizeNextPath', () => {
  it('accepts relative in-app paths with query and hash', () => {
    expect(sanitizeNextPath('/generations?sort=newest#top')).toBe('/generations?sort=newest#top');
  });

  it('normalizes whitespace around safe paths', () => {
    expect(sanitizeNextPath('  /account  ')).toBe('/account');
  });

  it('rejects non-path values', () => {
    expect(sanitizeNextPath('https://evil.example/phish')).toBe('/');
    expect(sanitizeNextPath('javascript:alert(1)')).toBe('/');
  });

  it('rejects protocol-relative paths', () => {
    expect(sanitizeNextPath('//evil.example')).toBe('/');
  });

  it('rejects slash-backslash protocol-relative variants', () => {
    expect(sanitizeNextPath('/\\evil.example')).toBe('/');
  });
});

describe('getSafeNextPathFromSearch', () => {
  it('returns sanitized next path from query string', () => {
    expect(getSafeNextPathFromSearch('?next=%2Faccount%3Ftab%3Dsecurity')).toBe('/account?tab=security');
  });

  it('falls back to root for unsafe next values', () => {
    expect(getSafeNextPathFromSearch('?next=%2F%2Fevil.example')).toBe('/');
  });

  it('falls back to root when next is missing', () => {
    expect(getSafeNextPathFromSearch('?foo=bar')).toBe('/');
  });
});
