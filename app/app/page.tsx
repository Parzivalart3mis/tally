import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUserId } from '@/lib/auth';
import {
  listBills,
  getUsedTags,
  listPeople,
  type BillFilters,
} from '@/lib/queries';
import { parseMoneyToCents } from '@/lib/money';
import { Button } from '@/components/ui/button';
import { HistoryList } from '@/components/bills/history-list';
import { HistoryFilters } from '@/components/bills/history-filters';
import type { BillCardData } from '@/components/bills/bill-card';

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const userId = await requireUserId();
  const sp = await searchParams;

  const tag = one(sp.tag);
  const person = one(sp.person);
  const from = one(sp.from);
  const to = one(sp.to);
  const min = one(sp.min);
  const max = one(sp.max);

  const filters: BillFilters = {
    ...(tag ? { tag } : {}),
    ...(person ? { person } : {}),
    ...(from ? { dateFrom: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { dateTo: new Date(`${to}T23:59:59`) } : {}),
    ...(min ? { minCents: parseMoneyToCents(min) } : {}),
    ...(max ? { maxCents: parseMoneyToCents(max) } : {}),
  };

  const [{ bills, total }, usedTags, people] = await Promise.all([
    listBills(userId, filters),
    getUsedTags(userId),
    listPeople(userId),
  ]);

  const data: BillCardData[] = bills.map((b) => ({
    id: b.id,
    title: b.title,
    grandTotalCents: b.grandTotalCents,
    engine: b.engine,
    sumCheckMatch: b.sumCheckMatch,
    receiptImageUrl: b.receiptImageUrl,
    createdAt: b.createdAt.toISOString(),
    participantNames: b.participantNames,
    tags: b.tags,
    paidByName: b.paidByName,
  }));

  const hasFilters = !!(tag || person || from || to || min || max);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
          <p className="text-sm text-text-muted">
            {total === 0
              ? hasFilters
                ? 'No bills match these filters.'
                : 'Your split history will live here.'
              : `${total} ${total === 1 ? 'bill' : 'bills'}${hasFilters ? ' matched' : ''}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/new">
            <Plus className="size-4" />
            New bill
          </Link>
        </Button>
      </div>

      <HistoryFilters
        tags={usedTags}
        people={people.map((p) => p.name)}
        current={{
          ...(tag ? { tag } : {}),
          ...(person ? { person } : {}),
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
          ...(min ? { min } : {}),
          ...(max ? { max } : {}),
        }}
      />

      <HistoryList bills={data} />
    </div>
  );
}
