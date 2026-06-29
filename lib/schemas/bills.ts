import { z } from 'zod';
import { SPLIT_ENGINES } from '@/lib/types';
import {
  nonNegCents,
  intCents,
  qtySchema,
  itemName,
  billTitle,
  personName,
  boundedName,
} from './common';

export const engineSchema = z.enum(SPLIT_ENGINES);

/** Extraction returns dollar amounts as read off the receipt (pre-review). */
const moneyDollars = z.number().finite().min(0).max(1_000_000);

export const extractedItemSchema = z.object({
  name: z.string().min(1).max(200),
  unitPrice: moneyDollars,
  qty: z.number().min(0).max(9999),
  lineTotal: moneyDollars,
  lowConfidence: z.boolean().optional(),
});

export const extractedReceiptSchema = z.object({
  merchant: z.string().max(200).optional(),
  items: z.array(extractedItemSchema).max(200),
  totals: z.object({
    subtotal: moneyDollars,
    tax: moneyDollars,
    service: moneyDollars,
    tip: moneyDollars,
    extras: moneyDollars,
    discount: moneyDollars,
    grandTotal: moneyDollars,
  }),
});

export const extractRequestSchema = z
  .object({
    blobUrl: z.string().url().max(2048),
    engine: engineSchema,
  })
  .strict();

/** Confirmed bill totals, in integer cents. */
export const totalsCentsSchema = z
  .object({
    subtotalCents: nonNegCents,
    taxCents: nonNegCents,
    serviceCents: nonNegCents,
    tipCents: nonNegCents,
    extrasCents: nonNegCents,
    discountCents: nonNegCents,
    grandTotalCents: nonNegCents,
    taxRate: z.number().min(0).max(1).optional(),
    discountBeforeTax: z.boolean().optional(),
  })
  .strict();

/** A confirmed line item on the wire (assignment is sent separately). */
export const computeItemSchema = z
  .object({
    name: itemName,
    unitPriceCents: nonNegCents,
    qty: qtySchema,
    lineTotalCents: nonNegCents,
  })
  .strict();

const assignmentsSchema = z
  .array(z.array(personName).min(1).max(100))
  .max(200);

/** Optional shares-counts, parallel to assignments (each row matches that
 *  item's sharer list). Absent rows / values default to weight 1. */
const weightsSchema = z
  .array(z.array(z.number().int().min(1).max(20)).max(100))
  .max(200);

function crossCheckAssignments(
  v: {
    items: unknown[];
    assignments: string[][];
    participantNames: string[];
    weights?: number[][] | undefined;
  },
  ctx: z.RefinementCtx,
) {
  if (v.assignments.length !== v.items.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'assignments must be parallel to items',
      path: ['assignments'],
    });
  }
  const known = new Set(v.participantNames);
  v.assignments.forEach((names, i) => {
    names.forEach((n) => {
      if (!known.has(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `"${n}" is not in participantNames`,
          path: ['assignments', i],
        });
      }
    });
  });
  // weights (if present) must line up one-to-one with each item's sharer list.
  if (v.weights) {
    if (v.weights.length !== v.assignments.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'weights must be parallel to assignments',
        path: ['weights'],
      });
    }
    v.weights.forEach((row, i) => {
      const sharers = v.assignments[i];
      if (sharers && row.length !== sharers.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'each weights row must match its item sharer count',
          path: ['weights', i],
        });
      }
    });
  }
}

/** Optional free-text instruction for the AI engines to adjust the split. */
export const billInstructions = z.string().trim().max(500).nullish();

export const computeRequestSchema = z
  .object({
    engine: engineSchema,
    items: z.array(computeItemSchema).min(1).max(200),
    totals: totalsCentsSchema,
    assignments: assignmentsSchema,
    weights: weightsSchema.optional(),
    participantNames: z.array(personName).min(1).max(100),
    instructions: billInstructions,
  })
  .strict()
  .superRefine(crossCheckAssignments);

// ── SplitResult (lenient: strips unknown keys a model might add) ──────────
const itemShareSchema = z.object({
  item: z.string().max(200),
  share: intCents,
});

export const splitResultSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().max(200),
      unitPrice: intCents,
      qty: z.number().min(0).max(9999),
      lineTotal: intCents,
      sharedBy: z.array(z.string().max(120)),
      sharePerPerson: intCents,
    }),
  ),
  participants: z.array(
    z.object({
      name: z.string().max(120),
      itemShares: z.array(itemShareSchema),
      subtotalBeforeTax: intCents,
      taxExtrasShare: intCents,
      total: intCents,
      centAdjustment: intCents.optional(),
    }),
  ),
  totals: z.object({
    subtotal: intCents,
    tax: intCents,
    service: intCents,
    tip: intCents,
    extras: intCents,
    discount: intCents,
    grandTotal: intCents,
  }),
  sumCheck: z.object({
    participantSum: intCents,
    grandTotal: intCents,
    match: z.boolean(),
  }),
});

export const saveBillRequestSchema = z
  .object({
    title: billTitle.nullish(),
    engine: engineSchema,
    receiptImageUrl: z.string().url().max(2048).nullish(),
    currency: z.string().length(3).default('USD'),
    paidByName: personName.nullish(),
    tags: z.array(boundedName(40)).max(20).optional(),
    instructions: billInstructions,
    items: z.array(computeItemSchema).min(1).max(200),
    totals: totalsCentsSchema,
    assignments: assignmentsSchema,
    weights: weightsSchema.optional(),
    participantNames: z.array(personName).min(1).max(100),
    result: splitResultSchema,
  })
  .strict()
  .superRefine(crossCheckAssignments);

export const listBillsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(200).default(''),
});

export type ExtractRequest = z.infer<typeof extractRequestSchema>;
export type ExtractedReceiptDto = z.infer<typeof extractedReceiptSchema>;
export type ComputeRequest = z.infer<typeof computeRequestSchema>;
export type SaveBillRequest = z.infer<typeof saveBillRequestSchema>;
export type TotalsCents = z.infer<typeof totalsCentsSchema>;
