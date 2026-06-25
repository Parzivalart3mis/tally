import { z } from 'zod';

/** Non-negative integer cents, capped at $1,000,000 to reject absurd input. */
export const nonNegCents = z.number().int().min(0).max(100_000_000);

/** Signed integer cents (shares, adjustments). */
export const intCents = z.number().int().min(-100_000_000).max(100_000_000);

/** Quantity: 0–9999, may be fractional (e.g. 0.5 lb). */
export const qtySchema = z.number().min(0).max(9999);

/** A trimmed, length-capped name field. */
export const boundedName = (max: number) =>
  z.string().trim().min(1).max(max);

export const personName = boundedName(120);
export const billTitle = boundedName(200);
export const itemName = boundedName(200);
