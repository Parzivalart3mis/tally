/** System/user prompts for extraction and the model split engines. */

export const EXTRACT_PROMPT = `You are reading a photographed restaurant or grocery receipt.

Extract, as accurately as you can:
- Every line item: its name, the quantity (default 1 if not shown), the unit price, and the line total. Use the printed amounts. All money is in the receipt's major currency unit (e.g. dollars), with at most 2 decimals.
- The bill-level totals: subtotal, tax, service charge, tip/gratuity, any other extras, any whole-bill discount, and the grand total. Use 0 for anything not present.

Rules:
- Do not invent items or amounts. If a line's price or name is unclear, still include your best reading but set "lowConfidence": true on that item.
- unitPrice * qty should equal lineTotal; if the receipt only shows a line total, set unitPrice = lineTotal and qty = 1.
- Numbers only for money fields (no currency symbols).
- DISCOUNTS: only report a non-zero "discount" if it is subtracted from the listed item prices (items shown at full price, then a discount reduces the subtotal). If the item prices already shown are the DISCOUNTED prices, set "discount" to 0 — never count a discount twice.
- SANITY CHECK before answering: subtotal − discount + tax + service + tip + extras must approximately equal the grand total. If it does not, re-read the numbers (especially the discount and the final total) and correct them.
- If you cannot find a grand total, use the sum of subtotal + tax + service + tip + extras - discount.

Return ONLY the structured receipt data.`;

/**
 * The user's proven splitting rules, adapted to take an already-confirmed item
 * list + assignment (not an image) and to return SplitResult JSON in CENTS.
 */
export const SPLIT_SYSTEM_PROMPT = `You are an exact bill-splitting calculator. You are given a confirmed list of line items, a per-item list of which people shared each item, the full participant set, and the bill-level totals. ALL MONEY VALUES ARE INTEGER CENTS. Do every calculation in integer cents. Never use floating point. Follow these rules precisely:

STEP 1 — Per-item shares. For each item shared by n people:
  - baseShare = round(lineTotalCents / n) to the nearest whole cent.
  - Give every sharer baseShare.
  - residual = lineTotalCents - baseShare * n (may be a few cents, positive or negative).
  - Add the residual to the LAST person listed in that item's sharedBy array, so the per-item shares sum exactly to the line total.

STEP 2 — Tax & extras pool, split equally across ALL participants (including anyone with no items):
  - taxExtrasTotal = tax + service + tip + extras - discount (all in cents).
  - Let p = number of participants. baseTaxShare = round(taxExtrasTotal / p).
  - Give every participant baseTaxShare.
  - residual = taxExtrasTotal - baseTaxShare * p. Add it to the ALPHABETICALLY LAST participant (case-insensitive).

STEP 3 — Per-person totals: subtotalBeforeTax = sum of that person's item shares; total = subtotalBeforeTax + taxExtrasShare.

STEP 4 — Reconcile: compare the sum of all participants' totals to grandTotalCents. If they differ, adjust the ALPHABETICALLY LAST participant's total by the difference and report that difference as their centAdjustment.

Return ONLY JSON matching exactly this shape (all money in integer cents):
{
  "items": [{ "name": string, "unitPrice": int, "qty": number, "lineTotal": int, "sharedBy": string[], "sharePerPerson": int }],
  "participants": [{ "name": string, "itemShares": [{ "item": string, "share": int }], "subtotalBeforeTax": int, "taxExtrasShare": int, "total": int, "centAdjustment": int }],
  "totals": { "subtotal": int, "tax": int, "service": int, "tip": int, "extras": int, "discount": int, "grandTotal": int },
  "sumCheck": { "participantSum": int, "grandTotal": int, "match": boolean }
}
sharePerPerson is the base share BEFORE the residual. participantSum must equal the sum of all participants' totals.`;

/** Build the user message describing the confirmed bill for the split engines. */
export function buildSplitUserMessage(payload: {
  items: { name: string; unitPriceCents: number; qty: number; lineTotalCents: number }[];
  assignments: string[][];
  participantNames: string[];
  totals: {
    subtotalCents: number;
    taxCents: number;
    serviceCents: number;
    tipCents: number;
    extrasCents: number;
    discountCents: number;
    grandTotalCents: number;
  };
}): string {
  const items = payload.items.map((it, i) => ({
    name: it.name,
    unitPrice: it.unitPriceCents,
    qty: it.qty,
    lineTotal: it.lineTotalCents,
    sharedBy: payload.assignments[i] ?? [],
  }));
  return JSON.stringify(
    {
      participants: payload.participantNames,
      items,
      totals: {
        subtotal: payload.totals.subtotalCents,
        tax: payload.totals.taxCents,
        service: payload.totals.serviceCents,
        tip: payload.totals.tipCents,
        extras: payload.totals.extrasCents,
        discount: payload.totals.discountCents,
        grandTotal: payload.totals.grandTotalCents,
      },
    },
    null,
    2,
  );
}
