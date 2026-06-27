'use client';

import { cn } from '@/lib/utils';
import { ResultView } from '@/components/bills/result-view';
import { TagInput } from '@/components/bills/tag-input';
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
  participantNames,
  paidBy,
  onPaidBy,
  tags,
  onTags,
  selfName,
}: {
  result: SplitResult;
  engine: SplitEngineId;
  verification: ComputeResponse['verification'];
  currency?: string;
  participantNames: string[];
  paidBy: string | null;
  onPaidBy: (p: string | null) => void;
  tags: string[];
  onTags: (t: string[]) => void;
  selfName?: string | null;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Result</h1>
        <p className="text-sm text-text-muted">
          Each person’s share, proven to add up.
        </p>
      </div>

      {/* Who paid */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Who paid?</p>
        <div className="flex flex-wrap gap-2">
          {participantNames.map((name) => {
            const active = paidBy === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => onPaidBy(active ? null : name)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-success bg-success/15 text-success'
                    : 'border-border bg-surface text-text hover:bg-surface-2',
                )}
              >
                {selfName && name === selfName ? 'You' : name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Tags</p>
        <TagInput value={tags} onChange={onTags} />
      </div>

      <ResultView
        engine={engine}
        currency={currency}
        animateTotals
        selfName={selfName}
        payerName={paidBy}
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
