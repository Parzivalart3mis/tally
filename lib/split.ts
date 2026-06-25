/**
 * Engine C — the exact deterministic split.
 *
 * Implements section 8 of the spec precisely, working entirely in integer
 * cents. This is the default engine; it cannot drift. Engines A (Claude) and
 * B (Groq) receive these same rules as instructions and return the same
 * SplitResult shape, which we then re-verify with `verifySplitResult`.
 */

import { roundToCent, sumCents } from './money';
import type { ComputeInput, SplitResult } from './types';

/** Deterministic "alphabetically last" by case-insensitive locale order. */
export function alphabeticallyLast(names: string[]): string | null {
  if (names.length === 0) return null;
  return names.reduce((max, n) =>
    n.localeCompare(max, 'en', { sensitivity: 'base' }) > 0 ? n : max,
  );
}

interface ItemAllocation {
  itemName: string;
  /** participant name -> share in cents (residual already folded in) */
  shares: Map<string, number>;
}

/**
 * Compute the exact split. Pure; no I/O. Assumes participantNames is the
 * de-duplicated union of everyone on the bill (callers/routes guarantee this).
 */
export function computeExactSplit(input: ComputeInput): SplitResult {
  const { items, totals } = input;
  const participants = dedupe(input.participantNames);
  const p = participants.length;
  const alphaLast = alphabeticallyLast(participants);

  // ── Step 1: per-item shares (residual to the last sharer) ──────────────
  const allocations: ItemAllocation[] = [];
  const itemSubtotalByPerson = new Map<string, number>();

  const resultItems: SplitResult['items'] = items.map((item) => {
    const sharers = item.sharedBy;
    const n = sharers.length;
    const lineTotal = item.lineTotalCents;
    const baseShare = n > 0 ? roundToCent(lineTotal / n) : 0;

    const shares = new Map<string, number>();
    for (const name of sharers) shares.set(name, baseShare);

    if (n > 0) {
      const residual = lineTotal - baseShare * n;
      const last = sharers[n - 1];
      if (last !== undefined) {
        shares.set(last, (shares.get(last) ?? 0) + residual);
      }
    }

    for (const [name, share] of shares) {
      itemSubtotalByPerson.set(
        name,
        (itemSubtotalByPerson.get(name) ?? 0) + share,
      );
    }

    allocations.push({ itemName: item.name, shares });

    return {
      name: item.name,
      unitPrice: item.unitPriceCents,
      qty: item.qty,
      lineTotal,
      sharedBy: sharers,
      sharePerPerson: baseShare,
    };
  });

  // ── Step 2: tax + extras pool, split equally across all participants ────
  const itemsSubtotal = sumCents(items.map((i) => i.lineTotalCents));
  const discount = totals.discountCents;

  // Effective tax amount (rate path computes it from the taxable subtotal).
  let taxAmount: number;
  if (totals.taxRate != null) {
    const taxableSubtotal = totals.subtotalCents || itemsSubtotal;
    const base = totals.discountBeforeTax
      ? Math.max(0, taxableSubtotal - discount)
      : taxableSubtotal;
    taxAmount = roundToCent(base * totals.taxRate);
  } else {
    taxAmount = totals.taxCents;
  }

  const taxExtrasTotal =
    taxAmount + totals.serviceCents + totals.tipCents + totals.extrasCents - discount;

  const baseTaxShare = p > 0 ? roundToCent(taxExtrasTotal / p) : 0;
  const taxShareByPerson = new Map<string, number>();
  for (const name of participants) taxShareByPerson.set(name, baseTaxShare);

  if (p > 0 && alphaLast !== null) {
    const taxResidual = taxExtrasTotal - baseTaxShare * p;
    taxShareByPerson.set(
      alphaLast,
      (taxShareByPerson.get(alphaLast) ?? 0) + taxResidual,
    );
  }

  // ── Step 3: per-person totals ──────────────────────────────────────────
  const resultParticipants: SplitResult['participants'] = participants.map(
    (name) => {
      const subtotalBeforeTax = itemSubtotalByPerson.get(name) ?? 0;
      const taxExtrasShare = taxShareByPerson.get(name) ?? 0;
      const itemShares = allocations
        .filter((a) => a.shares.has(name))
        .map((a) => ({ item: a.itemName, share: a.shares.get(name) ?? 0 }));
      return {
        name,
        itemShares,
        subtotalBeforeTax,
        taxExtrasShare,
        total: subtotalBeforeTax + taxExtrasShare,
      };
    },
  );

  // ── Step 4: reconcile against the receipt grand total ──────────────────
  const grandTotal = totals.grandTotalCents;
  let participantSum = sumCents(resultParticipants.map((r) => r.total));
  const diff = grandTotal - participantSum;

  if (diff !== 0 && alphaLast !== null) {
    const target = resultParticipants.find((r) => r.name === alphaLast);
    if (target) {
      // Fold the cent fix into their extras bucket so subtotal + extras = total.
      target.taxExtrasShare += diff;
      target.total += diff;
      target.centAdjustment = diff;
      participantSum += diff;
    }
  }

  return {
    items: resultItems,
    participants: resultParticipants,
    totals: {
      subtotal: itemsSubtotal,
      tax: taxAmount,
      service: totals.serviceCents,
      tip: totals.tipCents,
      extras: totals.extrasCents,
      discount,
      grandTotal,
    },
    sumCheck: {
      participantSum,
      grandTotal,
      match: participantSum === grandTotal,
    },
  };
}

/**
 * Re-verify a SplitResult in code — used to fact-check what Claude / Groq
 * returned. Recomputes the participant sum from the returned per-person totals
 * and checks the internal invariant (subtotal + extras = total) on each person.
 */
export function verifySplitResult(result: SplitResult): {
  participantSum: number;
  grandTotal: number;
  /** Does the participant sum reconcile to the grand total? */
  reconciles: boolean;
  /** Does every person's subtotal + extras (+adjustment) equal their total? */
  perPersonConsistent: boolean;
  match: boolean;
} {
  const participantSum = sumCents(result.participants.map((r) => r.total));
  const grandTotal = result.totals.grandTotal;
  const reconciles = participantSum === grandTotal;

  const perPersonConsistent = result.participants.every((person) => {
    const expected =
      person.subtotalBeforeTax +
      person.taxExtrasShare +
      // centAdjustment may be reported separately by a model; tolerate both.
      (person.centAdjustment ?? 0);
    // Accept either folded-in (adjustment already in extras) or separate.
    return (
      expected === person.total ||
      person.subtotalBeforeTax + person.taxExtrasShare === person.total
    );
  });

  return {
    participantSum,
    grandTotal,
    reconciles,
    perPersonConsistent,
    match: reconciles && perPersonConsistent,
  };
}

function dedupe(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
