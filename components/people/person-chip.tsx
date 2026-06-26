'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { initials } from '@/lib/format';

interface PersonChipProps {
  name: string;
  selected?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  /** Render as a static tag (no toggle affordance). */
  readOnly?: boolean;
}

/** A toggleable person chip. Springs scale 0.9 → 1.1 → 1 when toggled on. */
export function PersonChip({
  name,
  selected = false,
  onToggle,
  disabled = false,
  readOnly = false,
}: PersonChipProps) {
  const reduce = useReducedMotion();

  const content = (
    <>
      <span
        className={cn(
          'grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
          selected
            ? 'bg-white/20 text-white'
            : 'bg-surface-2 text-text-muted',
        )}
        aria-hidden
      >
        {selected ? <Check className="size-3.5" /> : initials(name)}
      </span>
      <span className="truncate">{name}</span>
    </>
  );

  const className = cn(
    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
    selected
      ? 'border-accent bg-accent text-white'
      : 'border-border bg-surface text-text hover:bg-surface-2',
    disabled && 'pointer-events-none opacity-50',
  );

  if (readOnly) {
    return (
      <span className={cn(className, 'cursor-default')}>{content}</span>
    );
  }

  const anim = reduce
    ? {}
    : {
        whileTap: { scale: 0.92 },
        animate: { scale: selected ? 1.06 : 1 },
        transition: { type: 'spring' as const, stiffness: 500, damping: 18 },
      };

  return (
    <motion.button
      type="button"
      aria-pressed={selected}
      aria-label={`${selected ? 'Remove' : 'Add'} ${name}`}
      disabled={disabled}
      onClick={onToggle}
      className={className}
      {...anim}
    >
      {content}
    </motion.button>
  );
}
