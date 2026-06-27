import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/auth';
import { getBillDetail, getSelfPersonId } from '@/lib/queries';
import { formatDate, ENGINE_META } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResultView } from '@/components/bills/result-view';
import { DeleteBillButton } from '@/components/bills/delete-bill-button';

export default async function BillDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const [detail, selfId] = await Promise.all([
    getBillDetail(userId, id),
    getSelfPersonId(userId),
  ]);
  if (!detail) notFound();

  const { bill, participants, items, assignments } = detail;
  const selfName =
    participants.find((p) => p.personId && p.personId === selfId)
      ?.nameSnapshot ?? null;

  const nameByBp = new Map(participants.map((p) => [p.id, p.nameSnapshot]));
  const sharesByItem = new Map<string, { name: string; shareCents: number }[]>();
  for (const a of assignments) {
    const arr = sharesByItem.get(a.billItemId) ?? [];
    arr.push({
      name: nameByBp.get(a.billParticipantId) ?? '?',
      shareCents: a.shareCents,
    });
    sharesByItem.set(a.billItemId, arr);
  }

  const viewItems = items.map((it) => ({
    name: it.name,
    qty: it.qty,
    lineTotalCents: it.lineTotalCents,
    shares: sharesByItem.get(it.id) ?? [],
  }));
  const viewParticipants = participants.map((p) => ({
    name: p.nameSnapshot,
    subtotalCents: p.subtotalCents,
    taxExtrasCents: p.taxExtrasCents,
    totalCents: p.totalCents,
    centAdjustment: p.centAdjustment,
  }));
  const participantSum = viewParticipants.reduce(
    (s, p) => s + p.totalCents,
    0,
  );

  const isModel = bill.engine !== 'EXACT_CODE';

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/app">
            <ArrowLeft className="size-4" />
            Bills
          </Link>
        </Button>
        <DeleteBillButton billId={bill.id} />
      </div>

      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {bill.title ?? 'Untitled bill'}
            </h1>
            <p className="text-sm text-text-muted">
              {formatDate(bill.createdAt)}
              {bill.paidByName ? ` · ${bill.paidByName} paid` : ''}
            </p>
          </div>
          <Badge variant="accent">{ENGINE_META[bill.engine].label}</Badge>
        </div>

        {bill.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {bill.tags.map((t) => (
              <Badge key={t} variant="neutral">
                {t}
              </Badge>
            ))}
          </div>
        )}

        {bill.receiptImageUrl && (
          <div className="overflow-hidden rounded-card border border-border bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bill.receiptImageUrl}
              alt={`Receipt for ${bill.title ?? 'this bill'}`}
              className="max-h-80 w-full object-contain"
            />
          </div>
        )}
      </header>

      <ResultView
        engine={bill.engine}
        currency={bill.currency}
        selfName={selfName}
        payerName={bill.paidByName}
        items={viewItems}
        participants={viewParticipants}
        totals={{
          subtotalCents: bill.subtotalCents,
          taxCents: bill.taxCents,
          serviceCents: bill.serviceCents,
          tipCents: bill.tipCents,
          extrasCents: bill.extrasCents,
          discountCents: bill.discountCents,
          grandTotalCents: bill.grandTotalCents,
        }}
        sumCheck={{
          participantSum,
          grandTotal: bill.grandTotalCents,
          match: bill.sumCheckMatch ?? participantSum === bill.grandTotalCents,
        }}
        {...(isModel ? { verified: bill.sumCheckMatch ?? false } : {})}
      />
    </div>
  );
}
