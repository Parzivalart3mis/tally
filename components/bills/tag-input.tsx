'use client';

import { useState } from 'react';
import { X, Plus } from 'lucide-react';

const SUGGESTED = ['dinner', 'groceries', 'trip', 'drinks', 'rent', 'travel'];

/** Editable tag list with quick-add suggestions. Tags are lowercased + deduped. */
export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  function add(raw: string) {
    const t = raw.trim().toLowerCase().slice(0, 40);
    if (!t || value.includes(t) || value.length >= 20) return;
    onChange([...value, t]);
    setDraft('');
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => onChange(value.filter((x) => x !== t))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(draft);
            }
          }}
          placeholder="Add tag…"
          maxLength={40}
          className="min-w-24 flex-1 bg-transparent text-sm text-text outline-none placeholder:text-text-hint"
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED.filter((s) => !value.includes(s)).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted hover:bg-surface-2"
          >
            <Plus className="size-3" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
