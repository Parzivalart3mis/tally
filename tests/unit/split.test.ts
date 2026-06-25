import { describe, it, expect } from 'vitest';
import {
  computeExactSplit,
  verifySplitResult,
  alphabeticallyLast,
} from '@/lib/split';
import type { ComputeInput, ComputeItem, ComputeTotals } from '@/lib/types';

function item(
  name: string,
  lineTotalCents: number,
  sharedBy: string[],
  opts: { unitPriceCents?: number; qty?: number } = {},
): ComputeItem {
  return {
    name,
    lineTotalCents,
    sharedBy,
    unitPriceCents: opts.unitPriceCents ?? lineTotalCents,
    qty: opts.qty ?? 1,
  };
}

function totals(t: Partial<ComputeTotals>): ComputeTotals {
  return {
    subtotalCents: 0,
    taxCents: 0,
    serviceCents: 0,
    tipCents: 0,
    extrasCents: 0,
    discountCents: 0,
    grandTotalCents: 0,
    ...t,
  };
}

function input(
  items: ComputeItem[],
  t: Partial<ComputeTotals>,
  participantNames: string[],
): ComputeInput {
  return { items, totals: totals(t), participantNames };
}

/** Convenience: map a result's participants to { name: total }. */
function totalsByName(r: ReturnType<typeof computeExactSplit>) {
  return Object.fromEntries(r.participants.map((p) => [p.name, p.total]));
}

describe('alphabeticallyLast', () => {
  it('is case-insensitive and deterministic', () => {
    expect(alphabeticallyLast(['Yash', 'Prakriti', 'Vishesh'])).toBe('Yash');
    expect(alphabeticallyLast(['alice', 'Bob', 'carol'])).toBe('carol');
    expect(alphabeticallyLast(['Bob'])).toBe('Bob');
    expect(alphabeticallyLast([])).toBeNull();
  });
});

describe('computeExactSplit — per-item shares', () => {
  it('splits evenly with no remainder', () => {
    const r = computeExactSplit(
      input(
        [item('Apples', 1000, ['Yash', 'Prakriti']), item('Bread', 400, ['Yash'])],
        { subtotalCents: 1400, grandTotalCents: 1400 },
        ['Yash', 'Prakriti'],
      ),
    );
    expect(totalsByName(r)).toEqual({ Yash: 900, Prakriti: 500 });
    expect(r.sumCheck.match).toBe(true);
    expect(r.sumCheck.participantSum).toBe(1400);
  });

  it('places the per-item rounding residual on the last sharer ($10 / 3)', () => {
    const r = computeExactSplit(
      input(
        [item('Pizza', 1000, ['Alice', 'Bob', 'Carol'])],
        { subtotalCents: 1000, grandTotalCents: 1000 },
        ['Alice', 'Bob', 'Carol'],
      ),
    );
    const pizza = r.items[0]!;
    expect(pizza.sharePerPerson).toBe(333); // base share before residual
    expect(totalsByName(r)).toEqual({ Alice: 333, Bob: 333, Carol: 334 });
    expect(r.sumCheck.match).toBe(true);
  });

  it('handles a negative per-item residual ($10 / 6 rounds up)', () => {
    const sharers = ['a', 'b', 'c', 'd', 'e', 'f'];
    const r = computeExactSplit(
      input([item('Tapas', 1000, sharers)], { grandTotalCents: 1000 }, sharers),
    );
    const t = totalsByName(r);
    expect(t).toEqual({ a: 167, b: 167, c: 167, d: 167, e: 167, f: 165 });
    expect(Object.values(t).reduce((s, v) => s + v, 0)).toBe(1000);
  });

  it('carries qty and unitPrice through to the result item', () => {
    const r = computeExactSplit(
      input(
        [item('Wings x2', 1800, ['X'], { unitPriceCents: 900, qty: 2 })],
        { grandTotalCents: 1800 },
        ['X'],
      ),
    );
    expect(r.items[0]).toMatchObject({
      name: 'Wings x2',
      unitPrice: 900,
      qty: 2,
      lineTotal: 1800,
    });
  });
});

describe('computeExactSplit — tax & extras pool', () => {
  it('splits tax + tip equally with no residual', () => {
    const r = computeExactSplit(
      input(
        [item('Meal', 3000, ['Yash', 'Prakriti', 'Vishesh'])],
        { subtotalCents: 3000, taxCents: 240, tipCents: 600, grandTotalCents: 3840 },
        ['Yash', 'Prakriti', 'Vishesh'],
      ),
    );
    expect(totalsByName(r)).toEqual({ Yash: 1280, Prakriti: 1280, Vishesh: 1280 });
    expect(r.sumCheck.match).toBe(true);
  });

  it('puts the tax-pool residual on the alphabetically last participant', () => {
    // tax pool of 1 cent split 3 ways -> base 0 each, 1 cent to "C"
    const r = computeExactSplit(
      input(
        [item('X', 300, ['A', 'B', 'C'])],
        { subtotalCents: 300, taxCents: 1, grandTotalCents: 301 },
        ['A', 'B', 'C'],
      ),
    );
    expect(totalsByName(r)).toEqual({ A: 100, B: 100, C: 101 });
    const c = r.participants.find((p) => p.name === 'C')!;
    expect(c.taxExtrasShare).toBe(1);
    expect(r.sumCheck.match).toBe(true);
  });

  it('charges a participant with no items their equal share of tax/extras', () => {
    const r = computeExactSplit(
      input(
        [item('Steak', 2000, ['Bob'])],
        { subtotalCents: 2000, tipCents: 200, grandTotalCents: 2200 },
        ['Ann', 'Bob'], // Ann ordered no items
      ),
    );
    const t = totalsByName(r);
    expect(t).toEqual({ Ann: 100, Bob: 2100 });
    const ann = r.participants.find((p) => p.name === 'Ann')!;
    expect(ann.subtotalBeforeTax).toBe(0);
    expect(ann.taxExtrasShare).toBe(100);
    expect(r.sumCheck.match).toBe(true);
  });
});

describe('computeExactSplit — discounts', () => {
  it('applies a whole-bill discount as an amount (reduces the pool)', () => {
    const r = computeExactSplit(
      input(
        [item('A', 1000, ['X']), item('B', 1000, ['Y'])],
        { subtotalCents: 2000, taxCents: 160, discountCents: 300, grandTotalCents: 1860 },
        ['X', 'Y'],
      ),
    );
    expect(totalsByName(r)).toEqual({ X: 930, Y: 930 });
    expect(r.sumCheck.match).toBe(true);
  });

  it('applies a discount before tax when tax is a rate', () => {
    const r = computeExactSplit(
      input(
        [item('A', 1000, ['X']), item('B', 1000, ['Y'])],
        {
          subtotalCents: 2000,
          discountCents: 200,
          taxRate: 0.1,
          discountBeforeTax: true,
          grandTotalCents: 1980,
        },
        ['X', 'Y'],
      ),
    );
    // tax = 10% of (2000 - 200) = 180; pool = 180 - 200 = -20; -10 each
    expect(r.totals.tax).toBe(180);
    expect(totalsByName(r)).toEqual({ X: 990, Y: 990 });
    expect(r.sumCheck.match).toBe(true);
  });
});

describe('computeExactSplit — final reconciliation', () => {
  it('adjusts the alphabetically last participant when the grand total drifts', () => {
    const r = computeExactSplit(
      input(
        [item('A', 1000, ['Alice', 'Bob'])],
        { subtotalCents: 1000, grandTotalCents: 1001 }, // receipt is 1 cent higher
        ['Alice', 'Bob'],
      ),
    );
    const bob = r.participants.find((p) => p.name === 'Bob')!;
    expect(bob.centAdjustment).toBe(1);
    expect(totalsByName(r)).toEqual({ Alice: 500, Bob: 501 });
    expect(r.sumCheck.match).toBe(true);
    expect(r.sumCheck.participantSum).toBe(1001);
  });

  it('reconciles a negative drift downward', () => {
    const r = computeExactSplit(
      input(
        [item('A', 1000, ['Alice', 'Bob'])],
        { subtotalCents: 1000, grandTotalCents: 999 },
        ['Alice', 'Bob'],
      ),
    );
    const bob = r.participants.find((p) => p.name === 'Bob')!;
    expect(bob.centAdjustment).toBe(-1);
    expect(r.sumCheck.match).toBe(true);
  });
});

describe('computeExactSplit — invariants on a complex bill', () => {
  it('every per-person total equals subtotal + extras, and sum = grand total', () => {
    const r = computeExactSplit(
      input(
        [
          item('Tacos', 1299, ['Yash', 'Prakriti']),
          item('Burrito', 1150, ['Vishesh']),
          item('Chips', 599, ['Yash', 'Prakriti', 'Vishesh']),
          item('Horchata', 450, ['Prakriti']),
        ],
        {
          subtotalCents: 1299 + 1150 + 599 + 450, // 3498
          taxCents: 289,
          tipCents: 700,
          grandTotalCents: 3498 + 289 + 700, // 4487
        },
        ['Yash', 'Prakriti', 'Vishesh'],
      ),
    );
    for (const p of r.participants) {
      expect(p.subtotalBeforeTax + p.taxExtrasShare).toBe(p.total);
    }
    const sum = r.participants.reduce((s, p) => s + p.total, 0);
    expect(sum).toBe(4487);
    expect(r.sumCheck.match).toBe(true);
  });
});

describe('verifySplitResult', () => {
  it('confirms a correct exact result', () => {
    const r = computeExactSplit(
      input(
        [item('A', 1000, ['Alice', 'Bob'])],
        { subtotalCents: 1000, taxCents: 100, grandTotalCents: 1100 },
        ['Alice', 'Bob'],
      ),
    );
    const v = verifySplitResult(r);
    expect(v.match).toBe(true);
    expect(v.reconciles).toBe(true);
    expect(v.perPersonConsistent).toBe(true);
  });

  it('flags a model result whose person totals do not sum to the grand total', () => {
    const bogus = computeExactSplit(
      input(
        [item('A', 1000, ['Alice', 'Bob'])],
        { subtotalCents: 1000, grandTotalCents: 1000 },
        ['Alice', 'Bob'],
      ),
    );
    // Simulate a model that fat-fingered a total.
    bogus.participants[0]!.total += 5;
    const v = verifySplitResult(bogus);
    expect(v.reconciles).toBe(false);
    expect(v.match).toBe(false);
  });
});
