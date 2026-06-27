'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export interface BillFilterValues {
  tag?: string;
  person?: string;
  from?: string; // YYYY-MM-DD
  to?: string;
  min?: string; // dollars
  max?: string;
}

export function HistoryFilters({
  tags,
  people,
  current,
}: {
  tags: string[];
  people: string[];
  current: BillFilterValues;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<BillFilterValues>(current);

  const active = Object.entries(current).filter(([, v]) => v);

  function navigate(next: BillFilterValues) {
    const p = new URLSearchParams();
    if (next.tag) p.set('tag', next.tag);
    if (next.person) p.set('person', next.person);
    if (next.from) p.set('from', next.from);
    if (next.to) p.set('to', next.to);
    if (next.min) p.set('min', next.min);
    if (next.max) p.set('max', next.max);
    const qs = p.toString();
    router.push(qs ? `/app?${qs}` : '/app');
  }

  function clearOne(key: keyof BillFilterValues) {
    const next = { ...current, [key]: undefined };
    navigate(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm">
              <SlidersHorizontal className="size-4" />
              Filters
              {active.length > 0 && (
                <span className="ml-1 rounded-full bg-accent px-1.5 text-[10px] font-semibold text-white">
                  {active.length}
                </span>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Filter bills</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Tag</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() =>
                          setF((s) => ({ ...s, tag: s.tag === t ? '' : t }))
                        }
                        className={
                          'rounded-full border px-2.5 py-1 text-xs ' +
                          (f.tag === t
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-muted')
                        }
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="filter-person">Person</Label>
                <select
                  id="filter-person"
                  value={f.person ?? ''}
                  onChange={(e) =>
                    setF((s) => ({ ...s, person: e.target.value }))
                  }
                  className="h-11 w-full rounded-input border border-border bg-surface px-3 text-base text-text"
                >
                  <option value="">Anyone</option>
                  {people.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="from">From</Label>
                  <Input
                    id="from"
                    type="date"
                    value={f.from ?? ''}
                    onChange={(e) =>
                      setF((s) => ({ ...s, from: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">To</Label>
                  <Input
                    id="to"
                    type="date"
                    value={f.to ?? ''}
                    onChange={(e) => setF((s) => ({ ...s, to: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="min">Min $</Label>
                  <Input
                    id="min"
                    inputMode="decimal"
                    value={f.min ?? ''}
                    onChange={(e) =>
                      setF((s) => ({ ...s, min: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="max">Max $</Label>
                  <Input
                    id="max"
                    inputMode="decimal"
                    value={f.max ?? ''}
                    onChange={(e) =>
                      setF((s) => ({ ...s, max: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setF({});
                  navigate({});
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <DialogClose asChild>
                <Button
                  className="flex-1"
                  onClick={() => {
                    navigate(f);
                    setOpen(false);
                  }}
                >
                  Apply
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>

        {active.map(([key, val]) => (
          <button
            key={key}
            type="button"
            onClick={() => clearOne(key as keyof BillFilterValues)}
            className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-text-muted"
          >
            {key === 'min' || key === 'max'
              ? `${key} $${val}`
              : `${key}: ${val}`}
            <X className="size-3" />
          </button>
        ))}
      </div>
    </div>
  );
}
