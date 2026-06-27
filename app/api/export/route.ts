import { z } from 'zod';
import { route, errors } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { getBillsForExport } from '@/lib/queries';

// Always run the function; never serve a cached (edge) response.
export const dynamic = 'force-dynamic';

const formatSchema = z.enum(['csv', 'json']);

const d = (cents: number) => (cents / 100).toFixed(2);
const iso = (v: Date) => v.toISOString();

/** Quote a CSV field, escaping embedded quotes. */
function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  const parsed = formatSchema.safeParse(
    new URL(req.url).searchParams.get('format') ?? 'json',
  );
  if (!parsed.success) throw errors.badRequest('format must be csv or json.');
  const format = parsed.data;

  const data = await getBillsForExport(userId);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    const json = data.map((b) => ({
      id: b.id,
      date: iso(b.createdAt),
      title: b.title,
      currency: b.currency,
      paidBy: b.paidByName,
      tags: b.tags,
      engine: b.engine,
      totals: {
        subtotal: d(b.subtotalCents),
        tax: d(b.taxCents),
        service: d(b.serviceCents),
        tip: d(b.tipCents),
        extras: d(b.extrasCents),
        discount: d(b.discountCents),
        grandTotal: d(b.grandTotalCents),
      },
      participants: b.participants.map((p) => ({
        name: p.nameSnapshot,
        subtotal: d(p.subtotalCents),
        taxExtras: d(p.taxExtrasCents),
        total: d(p.totalCents),
      })),
      items: b.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        lineTotal: d(it.lineTotalCents),
      })),
    }));
    return new Response(JSON.stringify(json, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="tally-export-${stamp}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // CSV: one row per (bill, participant).
  const header = [
    'bill_id',
    'date',
    'title',
    'currency',
    'grand_total',
    'paid_by',
    'tags',
    'person',
    'person_total',
    'is_payer',
  ];
  const lines = [header.join(',')];
  for (const b of data) {
    for (const p of b.participants) {
      lines.push(
        [
          b.id,
          iso(b.createdAt),
          b.title ?? '',
          b.currency,
          d(b.grandTotalCents),
          b.paidByName ?? '',
          b.tags.join('; '),
          p.nameSnapshot,
          d(p.totalCents),
          b.paidByName === p.nameSnapshot ? 'yes' : '',
        ]
          .map(csvCell)
          .join(','),
      );
    }
  }
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tally-export-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
});
