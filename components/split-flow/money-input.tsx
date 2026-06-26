'use client';

import { cn } from '@/lib/utils';

/** A right-aligned, tabular-nums decimal input for money (dollars). */
export function MoneyInput({
  value,
  onChange,
  placeholder = '0.00',
  className,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-text-hint">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          // allow only digits + a single dot
          const cleaned = e.target.value
            .replace(/[^0-9.]/g, '')
            .replace(/(\..*)\./g, '$1');
          onChange(cleaned);
        }}
        placeholder={placeholder}
        className="h-10 w-full rounded-input border border-border bg-surface pl-6 pr-2 text-right text-sm tabular text-text shadow-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
      />
    </div>
  );
}
