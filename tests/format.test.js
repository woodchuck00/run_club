import { describe, expect, it } from 'vitest';
import { initials, percent, pluralize } from '../src/lib/format.js';

describe('format helpers', () => {
  it('builds initials from a name', () => {
    expect(initials('Alex Runner')).toBe('AR');
    expect(initials('  sam  ')).toBe('S');
    expect(initials('')).toBe('');
  });

  it('pluralizes counts', () => {
    expect(pluralize(1, 'guest')).toBe('guest');
    expect(pluralize(2, 'guest')).toBe('guests');
  });

  it('calculates safe percentages', () => {
    expect(percent(5, 10)).toBe(50);
    expect(percent(5, 0)).toBe(0);
  });
});
