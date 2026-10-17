import { describe, expect, it } from 'vitest';
import { money, timeToMinutes, toggleListValue } from '../components/exploration/utils';

describe('exploration utils', () => {
  it('converts clock values to minutes', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('')).toBe(0);
  });

  it('formats published and unpublished salaries', () => {
    expect(money(600)).toBe('USD 600');
    expect(money(null)).toBe('No publica');
  });

  it('toggles a value in a list', () => {
    expect(toggleListValue([1, 2], 3)).toEqual([1, 2, 3]);
    expect(toggleListValue([1, 2], 2)).toEqual([1]);
  });
});
