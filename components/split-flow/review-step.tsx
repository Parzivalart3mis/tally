'use client';

import { Plus, Trash2, AlertTriangle, Wand2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MoneyInput } from './money-input';
import type { DraftItem, DraftTotals } from './types';

const TOTAL_FIELDS: { key: keyof DraftTotals; label: string }[] = [
  { key: 'subtotal', label: 'Subtotal' },
  { key: 'tax', label: 'Tax' },
  { key: 'tip', label: 'Tip' },
  { key: 'service', label: 'Service' },
  { key: 'extras', label: 'Extras' },
  { key: 'discount', label: 'Discount' },
];

export function ReviewStep({
  title,
  onTitle,
  items,
  onItem,
  onAddItem,
  onRemoveItem,
  totals,
  onTotal,
  onAutoFill,
}: {
  title: string;
  onTitle: (v: string) => void;
  items: DraftItem[];
  onItem: (id: string, patch: Partial<DraftItem>) => void;
  onAddItem: () => void;
  onRemoveItem: (id: string) => void;
  totals: DraftTotals;
  onTotal: (key: keyof DraftTotals, v: string) => void;
  onAutoFill: () => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Review</h1>
        <p className="text-sm text-text-muted">
          Fix anything the reader got wrong. Nothing is calculated yet.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bill-title">Place</Label>
        <Input
          id="bill-title"
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Merchant or a name for this bill"
          maxLength={200}
        />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Items</Label>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent tabular">
            {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className={
                'rounded-card border bg-surface p-3 ' +
                (item.lowConfidence ? 'border-warning/50' : 'border-border')
              }
            >
              <div className="flex items-center gap-2">
                <Input
                  value={item.name}
                  onChange={(e) => onItem(item.id, { name: e.target.value })}
                  placeholder="Item name"
                  maxLength={200}
                  aria-label="Item name"
                  className="h-10 flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove line"
                  onClick={() => onRemoveItem(item.id)}
                >
                  <Trash2 className="size-4 text-text-muted" />
                </Button>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <label className="space-y-1">
                  <span className="text-[11px] text-text-hint">Qty</span>
                  <Input
                    value={item.qty}
                    inputMode="decimal"
                    onChange={(e) =>
                      onItem(item.id, {
                        qty: e.target.value.replace(/[^0-9.]/g, ''),
                      })
                    }
                    className="h-10 text-right tabular"
                    aria-label="Quantity"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-text-hint">Unit price</span>
                  <MoneyInput
                    value={item.unitPrice}
                    onChange={(v) => onItem(item.id, { unitPrice: v })}
                    aria-label="Unit price"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[11px] text-text-hint">Line total</span>
                  <MoneyInput
                    value={item.lineTotal}
                    onChange={(v) => onItem(item.id, { lineTotal: v })}
                    aria-label="Line total"
                  />
                </label>
              </div>
              {item.lowConfidence && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                  <AlertTriangle className="size-3.5" />
                  The reader wasn’t sure about this line — please check it.
                </p>
              )}
            </li>
          ))}
        </ul>

        <Button variant="secondary" className="w-full" onClick={onAddItem}>
          <Plus className="size-4" />
          Add a line
        </Button>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Totals</Label>
          <Button variant="ghost" size="sm" onClick={onAutoFill}>
            <Wand2 className="size-3.5" />
            Fill from items
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-card border border-border bg-surface p-3">
          {TOTAL_FIELDS.map((f) => (
            <label key={f.key} className="space-y-1">
              <span className="text-[11px] text-text-hint">{f.label}</span>
              <MoneyInput
                value={totals[f.key]}
                onChange={(v) => onTotal(f.key, v)}
                aria-label={f.label}
              />
            </label>
          ))}
          <label className="col-span-2 space-y-1 border-t border-border pt-2">
            <span className="text-xs font-medium text-text">Grand total</span>
            <MoneyInput
              value={totals.grandTotal}
              onChange={(v) => onTotal('grandTotal', v)}
              aria-label="Grand total"
            />
          </label>
        </div>
      </section>
    </div>
  );
}
