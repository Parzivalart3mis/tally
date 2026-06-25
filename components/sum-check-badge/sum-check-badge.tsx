'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCents } from '@/lib/money';
import type { SplitEngineId } from '@/lib/types';

interface SumCheckBadgeProps {
  match: boolean;
  participantSum: number;
  grandTotal: number;
  centAdjustment?: number;
  engine: SplitEngineId;
  /** For model engines: whether code re-verification agreed. */
  verified?: boolean;
  currency?: string;
}

/**
 * The sum-check badge. Settles in with a small spring; green when the
 * per-person totals reconcile to the grand total, amber-to-red with a shake
 * when they don't. For model engines it also notes the code re-verification.
 */
export function SumCheckBadge({
  match,
  participantSum,
  grandTotal,
  centAdjustment,
  engine,
  verified,
  currency = 'USD',
}: SumCheckBadgeProps) {
  const reduce = useReducedMotion();
  const isModel = engine !== 'EXACT_CODE';
  const ok = match;

  const headline = ok
    ? 'Adds up'
    : 'Totals do not reconcile';

  const detail = ok
    ? `${formatCents(participantSum, currency)} across everyone equals the ${formatCents(grandTotal, currency)} total.`
    : `Per-person total is ${formatCents(participantSum, currency)}, but the bill is ${formatCents(grandTotal, currency)}.`;

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={reduce ? false : { scale: 0.9, opacity: 0 }}
      animate={
        reduce
          ? { opacity: 1 }
          : ok
            ? { scale: 1, opacity: 1 }
            : { scale: 1, opacity: 1, x: [0, -6, 6, -4, 4, 0] }
      }
      transition={
        ok
          ? { type: 'spring', stiffness: 320, damping: 20 }
          : { duration: 0.4 }
      }
      className={cn(
        'flex items-start gap-3 rounded-card border p-4',
        ok
          ? 'border-success/30 bg-success/10'
          : 'border-error/40 bg-error/10',
      )}
    >
      <span
        className={cn('mt-0.5 shrink-0', ok ? 'text-success' : 'text-error')}
        aria-hidden
      >
        {ok ? (
          <CheckCircle2 className="size-5" />
        ) : (
          <AlertTriangle className="size-5" />
        )}
      </span>
      <div className="min-w-0 space-y-1">
        <p
          className={cn(
            'text-sm font-semibold',
            ok ? 'text-success' : 'text-error',
          )}
        >
          {headline}
        </p>
        <p className="text-sm text-text-muted tabular">{detail}</p>
        {centAdjustment != null && centAdjustment !== 0 && (
          <p className="text-xs text-text-muted">
            A {formatCents(Math.abs(centAdjustment), currency)} rounding
            adjustment went to the alphabetically last person.
          </p>
        )}
        {isModel && (
          <p className="text-xs text-text-hint">
            {verified
              ? 'Re-verified in code: the model’s numbers reconcile.'
              : 'Heads up: a model did this math, and the code re-check did not reconcile it.'}
          </p>
        )}
      </div>
    </motion.div>
  );
}
