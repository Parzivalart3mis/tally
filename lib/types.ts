/**
 * Shared types for the split pipeline.
 *
 * MONEY CONVENTION: every monetary field below is an INTEGER number of cents.
 * The whole compute + storage + verification path stays in integers so the
 * arithmetic can never drift; we only format to 2-decimal currency at render.
 * (`qty` is the one non-money number and may be fractional, e.g. 0.5 lb.)
 */

export const SPLIT_ENGINES = ['CLAUDE_PROMPT', 'GROQ', 'EXACT_CODE'] as const;
export type SplitEngineId = (typeof SPLIT_ENGINES)[number];

/** A single confirmed line item handed to an engine. */
export interface ComputeItem {
  name: string;
  unitPriceCents: number;
  qty: number;
  lineTotalCents: number;
  /** Participant names that shared this item. Order matters: the last name
   *  receives the per-item rounding residual. */
  sharedBy: string[];
}

/** Confirmed bill-level totals. Tax may be given as an amount or a rate. */
export interface ComputeTotals {
  subtotalCents: number;
  taxCents: number;
  serviceCents: number;
  tipCents: number;
  extrasCents: number;
  discountCents: number;
  grandTotalCents: number;
  /** Optional: tax as a rate (e.g. 0.0825) instead of an amount. */
  taxRate?: number | undefined;
  /** Optional: whether the whole-bill discount applies before tax. */
  discountBeforeTax?: boolean | undefined;
}

/** Everything an engine needs to produce a SplitResult. */
export interface ComputeInput {
  items: ComputeItem[];
  totals: ComputeTotals;
  /** Union of everyone on the bill, including people with no items assigned. */
  participantNames: string[];
  /** Optional per-bill instruction for the AI engines (ignored by EXACT_CODE). */
  instructions?: string | null;
}

/** The single result shape every engine returns (all money in cents). */
export interface SplitResult {
  items: {
    name: string;
    unitPrice: number;
    qty: number;
    lineTotal: number;
    sharedBy: string[];
    /** Base share before the rounding residual is placed. */
    sharePerPerson: number;
  }[];
  participants: {
    name: string;
    itemShares: { item: string; share: number }[];
    subtotalBeforeTax: number;
    taxExtrasShare: number;
    total: number;
    /** Rounding fix applied to this person during reconciliation, if any. */
    centAdjustment?: number;
  }[];
  totals: {
    subtotal: number;
    tax: number;
    service: number;
    tip: number;
    extras: number;
    discount: number;
    grandTotal: number;
  };
  sumCheck: { participantSum: number; grandTotal: number; match: boolean };
}

/** Output of extraction: dollar amounts as read off a receipt (pre-review). */
export interface ExtractedItem {
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  /** Reader was unsure about this line — flag amber for review. */
  lowConfidence?: boolean;
}

export interface ExtractedTotals {
  subtotal: number;
  tax: number;
  service: number;
  tip: number;
  extras: number;
  discount: number;
  grandTotal: number;
}

export interface ExtractedReceipt {
  merchant?: string;
  items: ExtractedItem[];
  totals: ExtractedTotals;
}
