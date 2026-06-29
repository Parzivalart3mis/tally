'use client';

import { formatCents } from '@/lib/money';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';
import type { SplitEngineId } from '@/lib/types';
import { CountUpCents } from '@/components/motion/count-up';
import { SumCheckBadge } from '@/components/sum-check-badge/sum-check-badge';

export interface ResultViewItem {
  name: string;
  qty: number;
  lineTotalCents: number;
  shares: { name: string; shareCents: number; weight?: number }[];
}
export interface ResultViewParticipant {
  name: string;
  subtotalCents: number;
  taxExtrasCents: number;
  totalCents: number;
  centAdjustment: number;
}
export interface ResultViewTotals {
  subtotalCents: number;
  taxCents: number;
  serviceCents: number;
  tipCents: number;
  extrasCents: number;
  discountCents: number;
  grandTotalCents: number;
}

export interface ResultViewProps {
  engine: SplitEngineId;
  currency?: string;
  items: ResultViewItem[];
  participants: ResultViewParticipant[];
  totals: ResultViewTotals;
  sumCheck: { participantSum: number; grandTotal: number; match: boolean };
  verified?: boolean;
  animateTotals?: boolean;
  /** Name of the "me" participant — its row is emphasized. */
  selfName?: string | null | undefined;
  /** Name of who paid — its row gets a "paid" badge. */
  payerName?: string | null | undefined;
}

export function ResultView({
  engine,
  currency = 'USD',
  items,
  participants,
  totals,
  sumCheck,
  verified,
  animateTotals = false,
  selfName,
  payerName,
}: ResultViewProps) {
  const adjuster = participants.find((p) => p.centAdjustment !== 0);

  return (
    <div className="space-y-5">
      <SumCheckBadge
        match={sumCheck.match}
        participantSum={sumCheck.participantSum}
        grandTotal={sumCheck.grandTotal}
        centAdjustment={adjuster?.centAdjustment}
        engine={engine}
        verified={verified}
        currency={currency}
      />

      {/* Per-person breakdown */}
      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="border-b border-border bg-surface-2 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-text">Per person</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-text-hint">
              <th className="px-4 py-2 text-left font-medium">Person</th>
              <th className="px-2 py-2 text-right font-medium">Items</th>
              <th className="px-2 py-2 text-right font-medium">Tax + extras</th>
              <th className="px-4 py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {participants.map((p) => {
              const isSelf = !!selfName && p.name === selfName;
              const isPayer = !!payerName && p.name === payerName;
              return (
                <tr key={p.name} className={isSelf ? 'bg-accent-soft/40' : ''}>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-2">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
                        {initials(p.name)}
                      </span>
                      <span
                        className={cn('truncate', isSelf && 'font-semibold')}
                      >
                        {isSelf ? 'You' : p.name}
                      </span>
                      {isPayer && (
                        <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] font-medium text-success">
                          paid
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-right text-text-muted tabular">
                    {formatCents(p.subtotalCents, currency)}
                  </td>
                  <td className="px-2 py-2.5 text-right text-text-muted tabular">
                    {formatCents(p.taxExtrasCents, currency)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-2.5 text-right font-semibold text-highlight tabular',
                      isSelf && 'text-lg',
                    )}
                  >
                    {animateTotals ? (
                      <CountUpCents value={p.totalCents} currency={currency} />
                    ) : (
                      formatCents(p.totalCents, currency)
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border bg-surface-2">
              <td className="px-4 py-2.5 font-semibold" colSpan={3}>
                Grand total
              </td>
              <td className="px-4 py-2.5 text-right font-semibold tabular">
                {formatCents(totals.grandTotalCents, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* Per-item allocation */}
      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="border-b border-border bg-surface-2 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-text">Per item</h3>
        </div>
        <ul className="divide-y divide-border">
          {items.map((item, i) => (
            <li key={`${item.name}-${i}`} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium text-text">
                  {item.name}
                  {item.qty !== 1 && (
                    <span className="ml-1 text-xs text-text-hint">
                      ×{item.qty}
                    </span>
                  )}
                </p>
                <p className="shrink-0 text-text-muted tabular">
                  {formatCents(item.lineTotalCents, currency)}
                </p>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {item.shares.map((s) => (
                  <span
                    key={s.name}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-muted"
                  >
                    {s.name}
                    {s.weight && s.weight > 1 && (
                      <span className="font-semibold text-accent">×{s.weight}</span>
                    )}
                    <span className="font-medium text-text tabular">
                      {formatCents(s.shareCents, currency)}
                    </span>
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Totals summary */}
      <section className="rounded-card border border-border bg-surface p-4">
        <dl className="space-y-1.5 text-sm">
          <Row label="Subtotal" value={formatCents(totals.subtotalCents, currency)} />
          {totals.taxCents > 0 && (
            <Row label="Tax" value={formatCents(totals.taxCents, currency)} />
          )}
          {totals.serviceCents > 0 && (
            <Row label="Service" value={formatCents(totals.serviceCents, currency)} />
          )}
          {totals.tipCents > 0 && (
            <Row label="Tip" value={formatCents(totals.tipCents, currency)} />
          )}
          {totals.extrasCents > 0 && (
            <Row label="Extras" value={formatCents(totals.extrasCents, currency)} />
          )}
          {totals.discountCents > 0 && (
            <Row
              label="Discount"
              value={`−${formatCents(totals.discountCents, currency)}`}
            />
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold">
            <dt>Grand total</dt>
            <dd className="tabular">
              {formatCents(totals.grandTotalCents, currency)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-text-muted">
      <dt>{label}</dt>
      <dd className="tabular">{value}</dd>
    </div>
  );
}
