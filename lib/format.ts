import type { SplitEngineId } from '@/lib/types';

/** Human label + one-line description for each engine. */
export const ENGINE_META: Record<
  SplitEngineId,
  { label: string; short: string; description: string }
> = {
  EXACT_CODE: {
    label: 'Exact',
    short: 'Exact',
    description: 'In-app code. Deterministic, instant, free. Cannot drift.',
  },
  CLAUDE_PROMPT: {
    label: 'Claude',
    short: 'Claude',
    description: 'Claude does the arithmetic with the splitting rules.',
  },
  GROQ: {
    label: 'Groq',
    short: 'Groq',
    description: 'Fastest model path. Re-checked in code afterward.',
  },
};

const dateFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

export function formatDate(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return dateFmt.format(d);
}

/** Compact relative-ish day label, e.g. "Today", "Yesterday", or a date. */
export function formatDay(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfDay = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(now) - startOfDay(d)) / 86_400_000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return formatDate(d);
}

/** Build initials for an avatar chip. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}
