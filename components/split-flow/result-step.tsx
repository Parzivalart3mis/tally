'use client';

import { ResultView } from '@/components/bills/result-view';
import type { SplitResult, SplitEngineId } from '@/lib/types';
import type { ComputeResponse } from './types';

/** Reconstruct per-person item shares from sharedBy + base share (residual to
 *  the last sharer) — the same canonical rule used when persisting. */
function sharesFor(item: SplitResult['items'][number]) {
  const n = item.sharedBy.length;
  const base = item.sharePerPerson;
  return item.sharedBy.map((name, j) => ({
    name,
    shareCents: j === n - 1 ? item.lineTotal - base * (n - 1) : base,
  }));
}

export function ResultStep({
  result,
  engine,
  verification,
  currency = 'USD',
}: {
  result: SplitResult;
  engine: SplitEngineId;
  verification: ComputeResponse['verification'];
  currency?: string;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Result</h1>
        <p className="text-sm text-text-muted">
          Each person’s share, proven to add up.
        </p>
      </div>

      <ResultView
        engine={engine}
        currency={currency}
        animateTotals
        items={result.items.map((it) => ({
          name: it.name,
          qty: it.qty,
          lineTotalCents: it.lineTotal,
          shares: sharesFor(it),
        }))}
        participants={result.participants.map((p) => ({
          name: p.name,
          subtotalCents: p.subtotalBeforeTax,
          taxExtrasCents: p.taxExtrasShare,
          totalCents: p.total,
          centAdjustment: p.centAdjustment ?? 0,
        }))}
        totals={{
          subtotalCents: result.totals.subtotal,
          taxCents: result.totals.tax,
          serviceCents: result.totals.service,
          tipCents: result.totals.tip,
          extrasCents: result.totals.extras,
          discountCents: result.totals.discount,
          grandTotalCents: result.totals.grandTotal,
        }}
        sumCheck={result.sumCheck}
        {...(verification ? { verified: verification.match } : {})}
      />
    </div>
  );
}
