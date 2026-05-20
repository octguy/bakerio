import { describe, it, expect } from 'vitest';
import { formatVND } from './format';

describe('formatVND', () => {
  it('formats a number as VND currency', () => {
    const result = formatVND(45000);
    expect(result).toContain('45');
    expect(result).toMatch(/₫|VND/);
  });

  it('formats zero', () => {
    const result = formatVND(0);
    expect(result).toContain('0');
  });

  it('formats large numbers with separators', () => {
    const result = formatVND(1500000);
    expect(result).toContain('1.500.000') ;
  });
});
