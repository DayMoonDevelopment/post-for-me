import { describe, expect, it } from 'vitest';
import { normalizePlatform } from './platform.utils';

describe('normalizePlatform', () => {
  it('trims whitespace and lowercases mixed-case platforms', () => {
    expect(normalizePlatform(' \tInStaGram\n')).toBe('instagram');
  });

  it('preserves an empty string', () => {
    expect(normalizePlatform('')).toBe('');
  });
});
