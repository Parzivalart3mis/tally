'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useReducedMotion, type Transition } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { apiSend, apiUpload, ApiClientError } from '@/lib/client';
import { parseMoneyToCents } from '@/lib/money';
import type { SplitEngineId } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Stepper } from './stepper';
import { UploadStep } from './upload-step';
import { ReviewStep } from './review-step';
import { AssignStep } from './assign-step';
import { ResultStep } from './result-step';
import {
  EMPTY_TOTALS,
  type ComputeResponse,
  type DraftItem,
  type DraftTotals,
  type RosterPerson,
  type RosterPreset,
  type Step,
} from './types';

let idSeq = 0;
const newId = () => `it_${idSeq++}_${Math.round(Math.random() * 1e6)}`;

function blankItem(): DraftItem {
  return { id: newId(), name: '', unitPrice: '', qty: '1', lineTotal: '' };
}

function money(n: number): string {
  return n > 0 ? (n / 100).toFixed(2) : '';
}

export function SplitFlow({
  roster,
  presets,
  selfName,
}: {
  roster: RosterPerson[];
  presets: RosterPreset[];
  selfName?: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>('upload');
  const [engine, setEngine] = useState<SplitEngineId>('EXACT_CODE');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [totals, setTotals] = useState<DraftTotals>(EMPTY_TOTALS);
  const [assignments, setAssignments] = useState<Record<string, string[]>>({});
  const [extras, setExtras] = useState<string[]>([]);
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<ComputeResponse['result'] | null>(null);
  const [verification, setVerification] =
    useState<ComputeResponse['verification']>(null);

  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [computing, setComputing] = useState(false);
  const [saving, setSaving] = useState(false);

  const stepTransition: Transition = { duration: 0.22 };

  // ── line total in cents (explicit, else unit × qty) ──────────────────
  const lineCents = (item: DraftItem): number => {
    const lt = parseMoneyToCents(item.lineTotal);
    if (lt > 0) return lt;
    const up = parseMoneyToCents(item.unitPrice);
    const q = Number.parseFloat(item.qty) || 1;
    return Math.round(up * q);
  };

  // ── Upload ────────────────────────────────────────────────────────────
  async function onFile(file: File) {
    setPreviewUrl(URL.createObjectURL(file));
    setUploading(true);
    setBlobUrl(null);
    try {
      const { blobUrl: url } = await apiUpload<{ blobUrl: string }>(
        '/api/receipt/upload',
        file,
      );
      setBlobUrl(url);
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Upload failed. You can still enter the bill by hand.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function readReceipt() {
    if (!blobUrl) return;
    setExtracting(true);
    try {
      const data = await apiSend<{
        merchant: string | null;
        items: {
          name: string;
          unitPrice: number;
          qty: number;
          lineTotal: number;
          lowConfidence?: boolean;
        }[];
        totals: Record<string, number>;
      }>('/api/receipt/extract', 'POST', { blobUrl, engine });

      if (data.merchant) setTitle(data.merchant);
      const mapped = data.items.map((it) => ({
        id: newId(),
        name: it.name,
        unitPrice: money(Math.round(it.unitPrice * 100)),
        qty: String(it.qty || 1),
        lineTotal: money(Math.round(it.lineTotal * 100)),
        ...(it.lowConfidence ? { lowConfidence: true } : {}),
      }));
      // If nothing was read, still go to review with a blank line so the user
      // can add items by hand rather than seeing an empty screen.
      setItems(mapped.length > 0 ? mapped : [blankItem()]);
      if (mapped.length === 0) {
        toast.message('No items detected — add them by hand in review.');
      }
      setTotals({
        subtotal: money(Math.round((data.totals.subtotal ?? 0) * 100)),
        tax: money(Math.round((data.totals.tax ?? 0) * 100)),
        service: money(Math.round((data.totals.service ?? 0) * 100)),
        tip: money(Math.round((data.totals.tip ?? 0) * 100)),
        extras: money(Math.round((data.totals.extras ?? 0) * 100)),
        discount: money(Math.round((data.totals.discount ?? 0) * 100)),
        grandTotal: money(Math.round((data.totals.grandTotal ?? 0) * 100)),
      });
      setStep('review');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError
          ? err.message
          : 'Could not read the receipt. Enter it by hand instead.',
      );
    } finally {
      setExtracting(false);
    }
  }

  function enterManually() {
    if (items.length === 0) setItems([blankItem()]);
    setStep('review');
  }

  // ── Review editing ──────────────────────────────────────────────────────
  const patchItem = (id: string, patch: Partial<DraftItem>) =>
    setItems((list) =>
      list.map((it) => {
        if (it.id !== id) return it;
        const next = { ...it, ...patch };
        // keep lineTotal in sync when unit/qty change and no explicit override
        if (patch.unitPrice !== undefined || patch.qty !== undefined) {
          const up = parseMoneyToCents(next.unitPrice);
          const q = Number.parseFloat(next.qty) || 1;
          if (up > 0) next.lineTotal = money(Math.round(up * q));
        }
        return next;
      }),
    );

  const autoFill = () => {
    const subtotalCents = items.reduce((s, it) => s + lineCents(it), 0);
    const tax = parseMoneyToCents(totals.tax);
    const service = parseMoneyToCents(totals.service);
    const tip = parseMoneyToCents(totals.tip);
    const ex = parseMoneyToCents(totals.extras);
    const disc = parseMoneyToCents(totals.discount);
    const grand = subtotalCents + tax + service + tip + ex - disc;
    setTotals((t) => ({
      ...t,
      subtotal: money(subtotalCents),
      grandTotal: money(grand),
    }));
  };

  // ── Assignment ──────────────────────────────────────────────────────────
  const toggleAssign = (itemId: string, name: string) =>
    setAssignments((a) => {
      const cur = a[itemId] ?? [];
      return {
        ...a,
        [itemId]: cur.includes(name)
          ? cur.filter((n) => n !== name)
          : [...cur, name],
      };
    });

  const applyPreset = (itemId: string, names: string[]) =>
    setAssignments((a) => {
      const cur = new Set(a[itemId] ?? []);
      names.forEach((n) => cur.add(n));
      return { ...a, [itemId]: [...cur] };
    });

  const everyone = (itemId: string) =>
    setAssignments((a) => ({ ...a, [itemId]: roster.map((p) => p.name) }));

  const toggleExtra = (name: string) =>
    setExtras((e) =>
      e.includes(name) ? e.filter((n) => n !== name) : [...e, name],
    );

  // participant names = everyone assigned to an item ∪ explicit extras
  const participantNames = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) (assignments[it.id] ?? []).forEach((n) => set.add(n));
    extras.forEach((n) => set.add(n));
    return [...set];
  }, [items, assignments, extras]);

  const unassignedCount = items.filter(
    (it) => (assignments[it.id] ?? []).length === 0,
  ).length;

  const canCompute =
    items.length > 0 && unassignedCount === 0 && participantNames.length > 0;

  // ── Compute ─────────────────────────────────────────────────────────────
  function buildPayload() {
    const wireItems = items.map((it) => ({
      name: it.name.trim() || 'Item',
      unitPriceCents: parseMoneyToCents(it.unitPrice),
      qty: Number.parseFloat(it.qty) || 1,
      lineTotalCents: lineCents(it),
    }));
    const subtotalCents =
      parseMoneyToCents(totals.subtotal) ||
      wireItems.reduce((s, it) => s + it.lineTotalCents, 0);
    const taxCents = parseMoneyToCents(totals.tax);
    const serviceCents = parseMoneyToCents(totals.service);
    const tipCents = parseMoneyToCents(totals.tip);
    const extrasCents = parseMoneyToCents(totals.extras);
    const discountCents = parseMoneyToCents(totals.discount);
    const grandTotalCents =
      parseMoneyToCents(totals.grandTotal) ||
      subtotalCents + taxCents + serviceCents + tipCents + extrasCents - discountCents;

    const wireAssignments = items.map((it) => assignments[it.id] ?? []);

    return {
      engine,
      items: wireItems,
      totals: {
        subtotalCents,
        taxCents,
        serviceCents,
        tipCents,
        extrasCents,
        discountCents,
        grandTotalCents,
      },
      assignments: wireAssignments,
      participantNames,
    };
  }

  async function compute() {
    if (!canCompute) {
      toast.error('Assign every item before calculating.');
      return;
    }
    setComputing(true);
    try {
      const payload = buildPayload();
      const data = await apiSend<ComputeResponse>(
        '/api/bills/compute',
        'POST',
        payload,
      );
      setResult(data.result);
      setVerification(data.verification);
      setStep('result');
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : 'Could not calculate.',
      );
    } finally {
      setComputing(false);
    }
  }

  async function save() {
    if (!result) return;
    setSaving(true);
    try {
      const payload = buildPayload();
      const { bill } = await apiSend<{ bill: { id: string } }>(
        '/api/bills',
        'POST',
        {
          title: title.trim() || null,
          engine,
          receiptImageUrl: blobUrl,
          currency: 'USD',
          paidByName: paidBy,
          tags,
          items: payload.items,
          totals: payload.totals,
          assignments: payload.assignments,
          participantNames,
          result,
        },
      );
      toast.success('Bill saved.');
      router.push(`/app/bills/${bill.id}`);
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : 'Could not save.',
      );
      setSaving(false);
    }
  }

  // ── Bottom action bar config ────────────────────────────────────────────
  const bar = (() => {
    switch (step) {
      case 'upload':
        return {
          back: null,
          secondary: { label: 'Enter manually', onClick: enterManually },
          primary: {
            label: 'Read receipt',
            onClick: readReceipt,
            disabled: !blobUrl || extracting || uploading,
            busy: extracting,
            icon: <ArrowRight className="size-4" />,
          },
        };
      case 'review':
        return {
          back: () => setStep('upload'),
          secondary: null,
          primary: {
            label: 'Continue',
            onClick: () => setStep('assign'),
            disabled: items.length === 0,
            busy: false,
            icon: <ArrowRight className="size-4" />,
          },
        };
      case 'assign':
        return {
          back: () => setStep('review'),
          secondary: null,
          primary: {
            label: computing ? 'Calculating…' : 'Calculate',
            onClick: compute,
            disabled: !canCompute || computing,
            busy: computing,
            icon: <ArrowRight className="size-4" />,
          },
        };
      case 'result':
        return {
          back: () => setStep('assign'),
          secondary: null,
          primary: {
            label: 'Save bill',
            onClick: save,
            disabled: saving,
            busy: saving,
            icon: <Save className="size-4" />,
          },
        };
    }
  })();

  return (
    <div className="space-y-5 pb-24">
      <Stepper current={step} />

      <div className="relative overflow-hidden">
        {/* A keyed motion.div (NOT AnimatePresence mode="wait") — the active
            step always mounts immediately on key change and plays its entrance.
            mode="wait" intermittently failed to mount the next step under React
            19 (its exit's onComplete didn't fire), leaving a blank body. */}
        <motion.div
          key={step}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={stepTransition}
        >
            {step === 'upload' && (
              <UploadStep
                engine={engine}
                onEngine={setEngine}
                previewUrl={previewUrl}
                onFile={onFile}
                uploading={uploading}
                extracting={extracting}
              />
            )}
            {step === 'review' && (
              <ReviewStep
                title={title}
                onTitle={setTitle}
                items={items}
                onItem={patchItem}
                onAddItem={() => setItems((l) => [...l, blankItem()])}
                onRemoveItem={(id) =>
                  setItems((l) => l.filter((it) => it.id !== id))
                }
                totals={totals}
                onTotal={(key, v) => setTotals((t) => ({ ...t, [key]: v }))}
                onAutoFill={autoFill}
              />
            )}
            {step === 'assign' && (
              <AssignStep
                items={items}
                roster={roster}
                presets={presets}
                assignments={assignments}
                onToggle={toggleAssign}
                onApplyPreset={applyPreset}
                onEveryone={everyone}
                extras={extras}
                onToggleExtra={toggleExtra}
                engine={engine}
                onEngine={setEngine}
                lineCents={lineCents}
              />
            )}
            {step === 'result' && result && (
              <ResultStep
                result={result}
                engine={engine}
                verification={verification}
                participantNames={participantNames}
                paidBy={paidBy}
                onPaidBy={setPaidBy}
                tags={tags}
                onTags={setTags}
                selfName={selfName ?? null}
              />
            )}
        </motion.div>
      </div>

      {/* Pinned bottom action bar (clears the hidden bottom nav on this route) */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md">
        <div className="safe-x mx-auto flex w-full max-w-3xl items-center gap-2 py-3">
          {bar.back ? (
            <Button variant="ghost" size="icon" aria-label="Back" onClick={bar.back}>
              <ArrowLeft className="size-4" />
            </Button>
          ) : (
            <span className="size-11" />
          )}
          {bar.secondary && (
            <Button variant="secondary" onClick={bar.secondary.onClick}>
              {bar.secondary.label}
            </Button>
          )}
          <Button
            className="flex-1"
            onClick={bar.primary.onClick}
            disabled={bar.primary.disabled}
          >
            {bar.primary.busy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              bar.primary.icon
            )}
            {bar.primary.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
