'use client';

import { Users, AlertTriangle } from 'lucide-react';
import { formatCents } from '@/lib/money';
import { PersonChip } from '@/components/people/person-chip';
import { EnginePicker } from '@/components/engine-picker/engine-picker';
import { Button } from '@/components/ui/button';
import type { SplitEngineId } from '@/lib/types';
import type { DraftItem, RosterPerson, RosterPreset } from './types';

export function AssignStep({
  items,
  roster,
  presets,
  assignments,
  onToggle,
  onApplyPreset,
  onEveryone,
  extras,
  onToggleExtra,
  engine,
  onEngine,
  instructions,
  onInstructions,
  weights,
  onWeight,
  lineCents,
}: {
  items: DraftItem[];
  roster: RosterPerson[];
  presets: RosterPreset[];
  assignments: Record<string, string[]>;
  onToggle: (itemId: string, name: string) => void;
  onApplyPreset: (itemId: string, names: string[]) => void;
  onEveryone: (itemId: string) => void;
  extras: string[];
  onToggleExtra: (name: string) => void;
  engine: SplitEngineId;
  onEngine: (e: SplitEngineId) => void;
  instructions: string;
  onInstructions: (v: string) => void;
  weights: Record<string, Record<string, number>>;
  onWeight: (itemId: string, name: string, w: number) => void;
  lineCents: (item: DraftItem) => number;
}) {
  const exactSelected = engine === 'EXACT_CODE';
  const hasInstructions = instructions.trim().length > 0;
  const presetNames = (preset: RosterPreset) =>
    preset.memberIds
      .map((id) => roster.find((p) => p.id === id)?.name)
      .filter((n): n is string => Boolean(n));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assign</h1>
        <p className="text-sm text-text-muted">
          Tap the people who shared each item.
        </p>
      </div>

      {roster.length === 0 && (
        <p className="flex items-center gap-2 rounded-card border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertTriangle className="size-4" />
          Add people on the People tab first.
        </p>
      )}

      <ul className="space-y-3">
        {items.map((item) => {
          const selected = assignments[item.id] ?? [];
          const unassigned = selected.length === 0;
          return (
            <li
              key={item.id}
              className={
                'rounded-card border bg-surface p-3 ' +
                (unassigned ? 'border-warning/50' : 'border-border')
              }
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium text-text">
                  {item.name || 'Unnamed item'}
                </p>
                <p className="shrink-0 text-sm text-text-muted tabular">
                  {formatCents(lineCents(item))}
                </p>
              </div>

              {(presets.length > 0 || roster.length > 0) && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => onEveryone(item.id)}
                  >
                    Everyone
                  </Button>
                  {presets.map((preset) => (
                    <Button
                      key={preset.id}
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => onApplyPreset(item.id, presetNames(preset))}
                    >
                      <Users className="size-3" />
                      {preset.name}
                    </Button>
                  ))}
                </div>
              )}

              <div className="mt-2 flex flex-wrap gap-1.5">
                {roster.map((p) => (
                  <PersonChip
                    key={p.id}
                    name={p.name}
                    color={p.color}
                    selected={selected.includes(p.name)}
                    onToggle={() => onToggle(item.id, p.name)}
                  />
                ))}
              </div>

              {selected.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-[11px] uppercase tracking-wide text-text-hint">
                    Shares
                  </span>
                  {selected.map((name) => {
                    const w = weights[item.id]?.[name] ?? 1;
                    return (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1.5 text-xs text-text"
                      >
                        <span className="max-w-[88px] truncate">{name}</span>
                        <span className="inline-flex items-center overflow-hidden rounded-full border border-border">
                          <button
                            type="button"
                            aria-label={`Decrease ${name}'s shares`}
                            className="px-2 py-0.5 text-text-muted disabled:opacity-40"
                            disabled={w <= 1}
                            onClick={() => onWeight(item.id, name, w - 1)}
                          >
                            −
                          </button>
                          <span
                            className={
                              'min-w-[1.5rem] text-center tabular ' +
                              (w > 1 ? 'font-semibold text-accent' : 'text-text')
                            }
                          >
                            ×{w}
                          </span>
                          <button
                            type="button"
                            aria-label={`Increase ${name}'s shares`}
                            className="px-2 py-0.5 text-text-muted disabled:opacity-40"
                            disabled={w >= 20}
                            onClick={() => onWeight(item.id, name, w + 1)}
                          >
                            +
                          </button>
                        </span>
                      </span>
                    );
                  })}
                </div>
              )}

              {unassigned && (
                <p className="mt-2 text-xs text-warning">
                  No one assigned yet.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {roster.length > 0 && (
        <section className="space-y-2 rounded-card border border-border bg-surface p-3">
          <p className="text-sm font-medium text-text">
            Also splitting tax &amp; extras (no items)
          </p>
          <p className="text-xs text-text-muted">
            Add anyone who shared the table but ordered nothing.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {roster.map((p) => (
              <PersonChip
                key={p.id}
                name={p.name}
                color={p.color}
                selected={extras.includes(p.name)}
                onToggle={() => onToggleExtra(p.name)}
              />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-text">Split engine</p>
        <EnginePicker value={engine} onChange={onEngine} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text">
            Custom instructions{' '}
            <span className="font-normal text-text-hint">(optional)</span>
          </p>
          <span className="text-[11px] text-text-hint tabular">
            {instructions.length}/500
          </span>
        </div>
        <textarea
          value={instructions}
          onChange={(e) => onInstructions(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="e.g. Alice didn't drink — exclude her from the wine. Split the cake equally among everyone."
          className="w-full resize-y rounded-card border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-hint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        {hasInstructions && exactSelected ? (
          <div className="flex items-start gap-2 rounded-card border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span className="flex-1">
              The Exact engine can’t follow written instructions — they only
              apply with Claude or Groq.{' '}
              <button
                type="button"
                className="font-semibold underline"
                onClick={() => onEngine('CLAUDE_PROMPT')}
              >
                Use Claude
              </button>
            </span>
          </div>
        ) : (
          <p className="text-xs text-text-hint">
            Applies with the Claude or Groq engine. Totals always still
            reconcile to the grand total.
          </p>
        )}
      </div>
    </div>
  );
}
