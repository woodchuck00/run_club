import { describe, expect, it } from 'vitest';
import {
  asDate,
  asEmail,
  asId,
  asName,
  asOptionalDescription,
  asOptionalEmail,
  asPassword,
  asSlug,
  asTimezone,
  parseLimit,
} from '../functions/_lib/validate.js';

describe('validation helpers', () => {
  it('accepts a valid date-only value', () => {
    expect(asDate('2026-10-22')).toBe('2026-10-22');
  });

  it('rejects impossible dates and bad formats', () => {
    expect(() => asDate('2026-02-30')).toThrow('not a valid date');
    expect(() => asDate('22/10/2026')).toThrow('YYYY-MM-DD');
  });

  it('normalizes and validates email addresses', () => {
    expect(asEmail('  Runner@Example.COM ')).toBe('runner@example.com');
    expect(() => asEmail('not-an-email')).toThrow('not valid');
    expect(asOptionalEmail('')).toBeNull();
  });

  it('trims names and enforces password length', () => {
    expect(asName('  Alex Runner  ')).toBe('Alex Runner');
    expect(() => asName('   ')).toThrow('at least 1');
    expect(() => asPassword('short')).toThrow('at least 8');
    expect(asPassword('long-enough')).toBe('long-enough');
  });

  it('normalizes club URLs and rejects unsafe slugs', () => {
    expect(asSlug('  Riverside-Run-Club ')).toBe('riverside-run-club');
    expect(() => asSlug('bad slug')).toThrow('lowercase letters');
    expect(() => asSlug('../admin')).toThrow('lowercase letters');
  });

  it('validates timezones and optional descriptions', () => {
    expect(asTimezone('America/New_York')).toBe('America/New_York');
    expect(() => asTimezone('Mars/Olympus')).toThrow('not valid');
    expect(asOptionalDescription('  Tuesday nights  ')).toBe('Tuesday nights');
    expect(asOptionalDescription('')).toBeNull();
  });

  it('only accepts numeric ids', () => {
    expect(asId('42')).toBe('42');
    expect(() => asId('1 OR 1=1')).toThrow('not valid');
  });

  it('parses limits safely', () => {
    expect(parseLimit('25')).toBe(25);
    expect(parseLimit('999', 100, 200)).toBe(200);
    expect(parseLimit('nope', 50)).toBe(50);
  });
});
