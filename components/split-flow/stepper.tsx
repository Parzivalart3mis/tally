'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Step } from './types';

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'review', label: 'Review' },
  { id: 'assign', label: 'Assign' },
  { id: 'result', label: 'Result' },
];

export function Stepper({ current }: { current: Step }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <ol className="flex items-center gap-1.5" aria-label="Progress">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-1.5">
            <span
              className={cn(
                'grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition-colors',
                done && 'bg-accent text-white',
                active && 'bg-accent text-white ring-4 ring-accent-soft',
                !done && !active && 'bg-surface-2 text-text-hint',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                'hidden text-xs font-medium sm:inline',
                active ? 'text-text' : 'text-text-muted',
              )}
            >
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  'h-px flex-1',
                  i < currentIndex ? 'bg-accent' : 'bg-border',
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
