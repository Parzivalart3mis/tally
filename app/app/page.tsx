import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUserId } from '@/lib/auth';
import { listBills } from '@/lib/queries';
import { Button } from '@/components/ui/button';
import { HistoryList } from '@/components/bills/history-list';
import type { BillCardData } from '@/components/bills/bill-card';

export default async function HomePage() {
  const userId = await requireUserId();
  const { bills, total } = await listBills(userId);

  const data: BillCardData[] = bills.map((b) => ({
    id: b.id,
    title: b.title,
    grandTotalCents: b.grandTotalCents,
    engine: b.engine,
    sumCheckMatch: b.sumCheckMatch,
    receiptImageUrl: b.receiptImageUrl,
    createdAt: b.createdAt.toISOString(),
    participantNames: b.participantNames,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bills</h1>
          <p className="text-sm text-text-muted">
            {total === 0
              ? 'Your split history will live here.'
              : `${total} saved ${total === 1 ? 'bill' : 'bills'}.`}
          </p>
        </div>
        <Button asChild>
          <Link href="/app/new">
            <Plus className="size-4" />
            New bill
          </Link>
        </Button>
      </div>

      <HistoryList bills={data} />
    </div>
  );
}
