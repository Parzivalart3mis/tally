'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Users,
  X,
  Pencil,
  UserRound,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiSend } from '@/lib/client';
import { initials } from '@/lib/format';
import { PERSON_COLORS, colorHex } from '@/lib/colors';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PersonChip } from '@/components/people/person-chip';

export interface PersonDto {
  id: string;
  name: string;
  color?: string | null;
  note?: string | null;
}
export interface PresetDto {
  id: string;
  name: string;
  memberIds: string[];
}

/** A row of selectable palette swatches (plus a "no color" option). */
function ColorSwatches({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (c: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        aria-label="No color"
        onClick={() => onChange(null)}
        className={cn(
          'grid size-7 place-items-center rounded-full border border-border bg-surface-2 text-text-hint',
          value === null && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
        )}
      >
        <X className="size-3.5" />
      </button>
      {PERSON_COLORS.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-label={c.id}
          onClick={() => onChange(c.id)}
          style={{ background: c.hex }}
          className={cn(
            'size-7 rounded-full',
            value === c.id && 'ring-2 ring-accent ring-offset-2 ring-offset-bg',
          )}
        />
      ))}
    </div>
  );
}

export function PeopleManager({
  initialPeople,
  initialPresets,
  initialSelfId,
}: {
  initialPeople: PersonDto[];
  initialPresets: PresetDto[];
  initialSelfId?: string | null;
}) {
  const [people, setPeople] = useState(initialPeople);
  const [presets, setPresets] = useState(initialPresets);
  const [selfId, setSelfId] = useState<string | null>(initialSelfId ?? null);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function setSelf(id: string | null) {
    const prev = selfId;
    setSelfId(id);
    try {
      await apiSend('/api/me', 'PATCH', { selfPersonId: id });
    } catch (err) {
      setSelfId(prev);
      toast.error(err instanceof Error ? err.message : 'Could not update.');
    }
  }

  async function addPerson(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const { person } = await apiSend<{ person: PersonDto }>(
        '/api/people',
        'POST',
        { name, ...(newColor ? { color: newColor } : {}) },
      );
      setPeople((p) =>
        [...p, person].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setNewName('');
      setNewColor(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add person.');
    } finally {
      setAdding(false);
    }
  }

  async function removePerson(id: string) {
    const prev = people;
    setPeople((p) => p.filter((x) => x.id !== id));
    try {
      await apiSend(`/api/people/${id}`, 'DELETE');
      setPresets((ps) =>
        ps.map((pr) => ({
          ...pr,
          memberIds: pr.memberIds.filter((m) => m !== id),
        })),
      );
      toast.success('Removed. Past bills keep their name.');
    } catch (err) {
      setPeople(prev);
      toast.error(err instanceof Error ? err.message : 'Could not remove.');
    }
  }

  async function deletePreset(id: string) {
    const prev = presets;
    setPresets((ps) => ps.filter((x) => x.id !== id));
    try {
      await apiSend(`/api/presets/${id}`, 'DELETE');
    } catch (err) {
      setPresets(prev);
      toast.error(err instanceof Error ? err.message : 'Could not delete.');
    }
  }

  return (
    <div className="space-y-8">
      {/* Roster */}
      <section className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">People</h1>
          <p className="text-sm text-text-muted">
            The roster you split with. Removing someone keeps every past bill
            exactly as it was.
          </p>
        </div>

        <form onSubmit={addPerson} className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Add a person…"
              maxLength={120}
              aria-label="New person name"
            />
            <Button type="submit" disabled={adding || !newName.trim()}>
              <Plus className="size-4" />
              Add
            </Button>
          </div>
          <ColorSwatches value={newColor} onChange={setNewColor} />
        </form>

        {people.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
            No one yet. Add the people you split with.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
            <AnimatePresence initial={false}>
              {people.map((person) => (
                <motion.li
                  key={person.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                    style={{ background: colorHex(person.color) }}
                  >
                    {initials(person.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-text">
                      {person.name}
                      {selfId === person.id && (
                        <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                          You
                        </span>
                      )}
                    </p>
                    {person.note && (
                      <p className="truncate text-xs text-text-muted">
                        {person.note}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={
                      selfId === person.id
                        ? `Unset ${person.name} as you`
                        : `Set ${person.name} as you`
                    }
                    onClick={() =>
                      setSelf(selfId === person.id ? null : person.id)
                    }
                  >
                    <UserRound
                      className={cn(
                        'size-4',
                        selfId === person.id ? 'text-accent' : 'text-text-hint',
                      )}
                    />
                  </Button>
                  <PersonEditDialog
                    person={person}
                    onSaved={(updated) =>
                      setPeople((ps) =>
                        ps
                          .map((x) => (x.id === updated.id ? updated : x))
                          .sort((a, b) => a.name.localeCompare(b.name)),
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${person.name}`}
                    onClick={() => removePerson(person.id)}
                  >
                    <Trash2 className="size-4 text-text-muted" />
                  </Button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </section>

      {/* Presets */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Quick-assign presets</h2>
            <p className="text-sm text-text-muted">
              Tap a whole group onto an item at once.
            </p>
          </div>
          <PresetDialog
            people={people}
            onCreated={(preset) =>
              setPresets((ps) =>
                [...ps, preset].sort((a, b) => a.name.localeCompare(b.name)),
              )
            }
          />
        </div>

        {presets.length === 0 ? (
          <p className="rounded-card border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted">
            No presets yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {presets.map((preset) => {
              const names = preset.memberIds
                .map((id) => people.find((p) => p.id === id)?.name)
                .filter(Boolean) as string[];
              return (
                <li
                  key={preset.id}
                  className="flex items-center gap-3 rounded-card border border-border bg-surface px-4 py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-highlight/15 text-highlight">
                    <Users className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-text">
                      {preset.name}
                    </p>
                    <p className="truncate text-xs text-text-muted">
                      {names.length ? names.join(', ') : 'No members'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${preset.name}`}
                    onClick={() => deletePreset(preset.id)}
                  >
                    <X className="size-4 text-text-muted" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Export */}
      <section className="space-y-2">
        <div>
          <h2 className="text-lg font-semibold">Export</h2>
          <p className="text-sm text-text-muted">
            Download all your bills as a backup.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <a href="/api/export?format=csv" download>
              <Download className="size-4" />
              CSV
            </a>
          </Button>
          <Button asChild variant="secondary">
            <a href="/api/export?format=json" download>
              <Download className="size-4" />
              JSON
            </a>
          </Button>
        </div>
      </section>
    </div>
  );
}

function PersonEditDialog({
  person,
  onSaved,
}: {
  person: PersonDto;
  onSaved: (p: PersonDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(person.name);
  const [color, setColor] = useState<string | null>(person.color ?? null);
  const [note, setNote] = useState(person.note ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { person: updated } = await apiSend<{ person: PersonDto }>(
        `/api/people/${person.id}`,
        'PATCH',
        { name: name.trim(), color, note: note.trim() || null },
      );
      onSaved(updated);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit ${person.name}`}>
          <Pencil className="size-4 text-text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit person</DialogTitle>
          <DialogDescription>Name, color, and a note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <ColorSwatches value={color} onChange={setColor} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-note">Note</Label>
            <Input
              id="edit-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nickname or a reminder"
              maxLength={200}
            />
          </div>
        </div>
        <Button onClick={save} disabled={saving || !name.trim()}>
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function PresetDialog({
  people,
  onCreated,
}: {
  people: PersonDto[];
  onCreated: (preset: PresetDto) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function save() {
    if (!name.trim() || selected.size === 0) return;
    setSaving(true);
    try {
      const { preset } = await apiSend<{ preset: PresetDto }>(
        '/api/presets',
        'POST',
        { name: name.trim(), memberIds: [...selected] },
      );
      onCreated(preset);
      setOpen(false);
      setName('');
      setSelected(new Set());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save preset.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" disabled={people.length === 0}>
          <Plus className="size-4" />
          Preset
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New preset</DialogTitle>
          <DialogDescription>
            Name a group and pick who is in it.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="preset-name">Name</Label>
            <Input
              id="preset-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Roommates"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Members</Label>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <PersonChip
                  key={p.id}
                  name={p.name}
                  color={p.color}
                  selected={selected.has(p.id)}
                  onToggle={() => toggle(p.id)}
                />
              ))}
            </div>
          </div>
        </div>
        <Button
          onClick={save}
          disabled={saving || !name.trim() || selected.size === 0}
        >
          Save preset
        </Button>
      </DialogContent>
    </Dialog>
  );
}
