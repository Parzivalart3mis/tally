'use client';

import { motion } from 'framer-motion';
import { Cpu, Sparkles, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ENGINE_META } from '@/lib/format';
import { SPLIT_ENGINES, type SplitEngineId } from '@/lib/types';

const ICONS: Record<SplitEngineId, typeof Cpu> = {
  EXACT_CODE: Cpu,
  CLAUDE_PROMPT: Sparkles,
  GROQ: Zap,
};

interface EnginePickerProps {
  value: SplitEngineId;
  onChange: (engine: SplitEngineId) => void;
  disabled?: boolean;
}

/** Per-bill engine selector. Defaults to Exact; honest about model drift. */
export function EnginePicker({ value, onChange, disabled }: EnginePickerProps) {
  return (
    <div className="space-y-2">
      <div
        role="radiogroup"
        aria-label="Split engine"
        className="grid grid-cols-3 gap-2"
      >
        {SPLIT_ENGINES.map((engine) => {
          const Icon = ICONS[engine];
          const active = value === engine;
          return (
            <button
              key={engine}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={disabled}
              onClick={() => onChange(engine)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 rounded-card border p-3 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-border bg-surface hover:bg-surface-2',
                disabled && 'pointer-events-none opacity-50',
              )}
            >
              {active && (
                <motion.span
                  layoutId="engine-active"
                  className="absolute inset-0 -z-10 rounded-card ring-2 ring-accent"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  'size-5',
                  active ? 'text-accent' : 'text-text-muted',
                )}
              />
              <span
                className={cn(
                  'text-sm font-medium',
                  active ? 'text-accent' : 'text-text',
                )}
              >
                {ENGINE_META[engine].label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-text-muted">{ENGINE_META[value].description}</p>
    </div>
  );
}
