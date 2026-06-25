/**
 * Money helpers. All split math runs in integer cents to avoid float drift;
 * we only convert to a 2-decimal currency string at the presentation edge.
 */

/** Round a cent value to the nearest whole cent (half away from zero). */
export function roundToCent(cents: number): number {
  // We operate on cents already; this guards against any fractional cents
  // introduced by a division (e.g. lineTotal / n).
  return Math.round(cents);
}

/**
 * Convert a decimal currency amount (e.g. 12.34 dollars) to integer cents.
 * Uses a string-safe rounding to dodge classic float errors like 1.005.
 */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) return 0;
  // Scale, round half-up away from zero, avoiding 0.1+0.2 style drift.
  return Math.round((amount + Number.EPSILON) * 100);
}

/** Convert integer cents to a Number of major units (dollars). */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Format integer cents as a localized currency string. */
export function formatCents(
  cents: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/** Format a major-unit amount as currency (for un-cented inputs). */
export function formatAmount(
  amount: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Parse a user-typed money string ("$1,234.50", "12") into integer cents.
 * Returns 0 for unparseable input.
 */
export function parseMoneyToCents(input: string | number): number {
  if (typeof input === 'number') return toCents(input);
  const cleaned = input.replace(/[^0-9.\-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? toCents(value) : 0;
}

/** Sum a list of cent values. */
export function sumCents(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
