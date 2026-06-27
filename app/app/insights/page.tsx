import { BarChart3 } from 'lucide-react';
import { requireUserId } from '@/lib/auth';
import { getInsights } from '@/lib/queries';
import { formatCents } from '@/lib/money';
import { initials } from '@/lib/format';
import { colorHex } from '@/lib/colors';

export const metadata = { title: 'Insights' };

export default async function InsightsPage() {
  const userId = await requireUserId();
  const ins = await getInsights(userId);

  if (ins.billCount === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-text-hint">
          <BarChart3 className="size-6" />
        </span>
        <p className="font-medium text-text">No insights yet.</p>
        <p className="text-sm text-text-muted">
          Save a few bills and your spending shows up here.
        </p>
      </div>
    );
  }

  const monthMax = Math.max(1, ...ins.months.map((m) => m.cents));
  const personMax = Math.max(1, ...ins.people.map((p) => p.totalCents));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-text-muted">
          Your splitting at a glance — no balances, just totals.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="This month"
          value={formatCents(ins.thisMonthCents)}
          sub={`${ins.thisMonthCount} ${ins.thisMonthCount === 1 ? 'bill' : 'bills'}`}
        />
        <Stat label="Average bill" value={formatCents(ins.avgCents)} />
        <Stat
          label="Total split"
          value={formatCents(ins.totalCents)}
          sub={`${ins.billCount} ${ins.billCount === 1 ? 'bill' : 'bills'}`}
        />
        <Stat
          label="Most split with"
          value={ins.mostSplitWith?.name ?? '—'}
          sub={
            ins.mostSplitWith
              ? `${ins.mostSplitWith.billCount} ${ins.mostSplitWith.billCount === 1 ? 'bill' : 'bills'}`
              : undefined
          }
        />
      </div>

      {/* Monthly bars */}
      <section className="rounded-card border border-border bg-surface p-4">
        <h2 className="text-sm font-semibold text-text">Last 6 months</h2>
        <div className="mt-4 flex h-32 items-end justify-between gap-2">
          {ins.months.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t bg-accent/80"
                style={{
                  height: `${Math.max(2, (m.cents / monthMax) * 100)}%`,
                }}
                title={formatCents(m.cents)}
              />
              <span className="text-[11px] text-text-muted">{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Per-person totals */}
      <section className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="border-b border-border bg-surface-2 px-4 py-2.5">
          <h2 className="text-sm font-semibold text-text">Per person</h2>
        </div>
        <ul className="divide-y divide-border">
          {ins.people.map((p) => (
            <li key={p.name} className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span
                  className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
                  style={{ background: colorHex(null) }}
                >
                  {initials(p.name)}
                </span>
                <span className="flex-1 truncate text-sm text-text">
                  {p.name}
                </span>
                <span className="text-sm font-semibold text-highlight tabular">
                  {formatCents(p.totalCents)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${(p.totalCents / personMax) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string | undefined;
}) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 truncate text-xl font-semibold text-text tabular">
        {value}
      </p>
      {sub && <p className="text-xs text-text-hint">{sub}</p>}
    </div>
  );
}
