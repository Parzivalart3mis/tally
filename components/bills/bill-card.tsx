'use client';

import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { formatDay, ENGINE_META } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import type { SplitEngineId } from '@/lib/types';

export interface BillCardData {
  id: string;
  title: string | null;
  grandTotalCents: number;
  engine: SplitEngineId;
  sumCheckMatch: boolean | null;
  receiptImageUrl: string | null;
  createdAt: string;
  participantNames: string[];
  tags?: string[];
  paidByName?: string | null;
}

export function BillCard({ bill }: { bill: BillCardData }) {
  return (
    <Link
      href={`/app/bills/${bill.id}`}
      className="group flex gap-3 rounded-card border border-border bg-surface p-3 shadow-card transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <div className="size-16 shrink-0 overflow-hidden rounded-thumb border border-border bg-surface-2">
        {bill.receiptImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bill.receiptImageUrl}
            alt={`Receipt for ${bill.title ?? 'bill'}`}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-text-hint">
            <Receipt className="size-6" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-medium text-text">
            {bill.title ?? 'Untitled bill'}
          </p>
          <p className="shrink-0 font-semibold text-highlight tabular">
            {formatCents(bill.grandTotalCents)}
          </p>
        </div>
        <p className="text-xs text-text-muted">
          {formatDay(bill.createdAt)}
          {bill.paidByName ? ` · ${bill.paidByName} paid` : ''}
        </p>
        {bill.tags && bill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bill.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent"
              >
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {bill.participantNames.slice(0, 4).map((name) => (
            <span
              key={name}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted"
            >
              {name}
            </span>
          ))}
          {bill.participantNames.length > 4 && (
            <span className="text-[11px] text-text-hint">
              +{bill.participantNames.length - 4}
            </span>
          )}
          <Badge variant="neutral" className="ml-auto">
            {ENGINE_META[bill.engine].short}
          </Badge>
        </div>
      </div>
    </Link>
  );
}
