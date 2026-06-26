import { computeExactSplit } from '@/lib/split';
import type { ComputeItem, ComputeTotals } from '@/lib/types';
import type { SaveBillRequest } from '@/lib/schemas/bills';

/** JSON Request factory for exercising route handlers directly. */
export function jsonRequest(
  url: string,
  method: string,
  body?: unknown,
): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { 'content-type': 'application/json' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

export function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

/** Build a valid SaveBillRequest from items + totals, computing with Engine C. */
export function buildSaveBill(
  title: string,
  items: ComputeItem[],
  totals: ComputeTotals,
  participantNames: string[],
): SaveBillRequest {
  const result = computeExactSplit({ items, totals, participantNames });
  return {
    title,
    engine: 'EXACT_CODE',
    receiptImageUrl: null,
    currency: 'USD',
    items: items.map((i) => ({
      name: i.name,
      unitPriceCents: i.unitPriceCents,
      qty: i.qty,
      lineTotalCents: i.lineTotalCents,
    })),
    totals,
    assignments: items.map((i) => i.sharedBy),
    participantNames,
    result,
  };
}

export function item(
  name: string,
  cents: number,
  sharedBy: string[],
): ComputeItem {
  return {
    name,
    unitPriceCents: cents,
    qty: 1,
    lineTotalCents: cents,
    sharedBy,
  };
}

export function totals(t: Partial<ComputeTotals>): ComputeTotals {
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
