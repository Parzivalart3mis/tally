import { describe, it, expect } from 'vitest';
import {
  toCents,
  fromCents,
  roundToCent,
  formatCents,
  parseMoneyToCents,
  sumCents,
} from '@/lib/money';

describe('toCents', () => {
  it('converts clean decimals exactly', () => {
    expect(toCents(12.34)).toBe(1234);
    expect(toCents(0.1)).toBe(10);
    expect(toCents(1.1)).toBe(110);
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(100)).toBe(10000);
    expect(toCents(0)).toBe(0);
  });

  it('handles the 0.1 + 0.2 family without drift', () => {
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it('returns 0 for non-finite input', () => {
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
  });
});

describe('fromCents', () => {
  it('converts back to major units', () => {
    expect(fromCents(1234)).toBe(12.34);
    expect(fromCents(0)).toBe(0);
  });
});

describe('roundToCent', () => {
  it('rounds fractional cents to whole', () => {
    expect(roundToCent(333.3333)).toBe(333);
    expect(roundToCent(333.5)).toBe(334);
    expect(roundToCent(-10.5)).toBe(-10); // Math.round half-up
  });
});

describe('formatCents', () => {
  it('formats USD by default', () => {
    expect(formatCents(1234)).toBe('$12.34');
    expect(formatCents(0)).toBe('$0.00');
    expect(formatCents(-500)).toBe('-$5.00');
  });
});

describe('parseMoneyToCents', () => {
  it('parses formatted strings', () => {
    expect(parseMoneyToCents('$1,234.50')).toBe(123450);
    expect(parseMoneyToCents('12')).toBe(1200);
    expect(parseMoneyToCents('0.99')).toBe(99);
  });

  it('accepts numbers directly', () => {
    expect(parseMoneyToCents(5)).toBe(500);
  });

  it('returns 0 for junk', () => {
    expect(parseMoneyToCents('')).toBe(0);
    expect(parseMoneyToCents('abc')).toBe(0);
    expect(parseMoneyToCents('.')).toBe(0);
  });
});

describe('sumCents', () => {
  it('sums a list', () => {
    expect(sumCents([100, 200, 300])).toBe(600);
    expect(sumCents([])).toBe(0);
  });
});
