import { describe, expect, it } from 'vitest';
import { parseDateOnly, todayInputValue } from '../src/lib/dates.js';

describe('date helpers', () => {
  it('parses date-only values without timezone drift', () => {
    const parsed = parseDateOnly('2026-10-22');
    expect(parsed).not.toBeNull();
    expect(parsed.year).toBe(2026);
    expect(parsed.month).toBe(10);
    expect(parsed.day).toBe(22);
  });

  it('rejects invalid date-only values', () => {
    expect(parseDateOnly('2026-02-30')).toBeNull();
    expect(parseDateOnly('22-10-2026')).toBeNull();
    expect(parseDateOnly(null)).toBeNull();
  });

  it('formats a local date for date inputs', () => {
    expect(todayInputValue(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats today in a configured timezone', () => {
    expect(
      todayInputValue(new Date('2026-01-01T01:00:00Z'), 'America/New_York'),
    ).toBe('2025-12-31');
  });
});
