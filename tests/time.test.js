import { describe, expect, it } from 'vitest';
import { formatFinishTime, parseFinishTime } from '../src/lib/time.js';

describe('time helpers', () => {
  it('parses finish times entered as MM:SS or H:MM:SS', () => {
    expect(parseFinishTime('25:30')).toBe(1530);
    expect(parseFinishTime('1:02:15')).toBe(3735);
    expect(parseFinishTime(' 09:05 ')).toBe(545);
  });

  it('rejects malformed or out-of-range times', () => {
    expect(parseFinishTime('25')).toBeNull();
    expect(parseFinishTime('12:75')).toBeNull();
    expect(parseFinishTime('0:00')).toBeNull();
    expect(parseFinishTime('1:2:3:4')).toBeNull();
    expect(parseFinishTime('abc')).toBeNull();
  });

  it('formats seconds back into a readable finish time', () => {
    expect(formatFinishTime(1530)).toBe('25:30');
    expect(formatFinishTime(3735)).toBe('1:02:15');
    expect(formatFinishTime(545)).toBe('9:05');
    expect(formatFinishTime(null)).toBe('');
  });
});
