import { and, count, desc, eq, inArray, like } from 'drizzle-orm';
import { db } from '@/db';
import { bills, billParticipants } from '@/db/schema';
import { route, jsonOk, parseJson } from '@/lib/api';
import { requireUserId, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { listBillsQuerySchema, saveBillRequestSchema } from '@/lib/schemas';
import { persistBill } from '@/lib/persist-bill';

const PAGE_SIZE = 12;

export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  const { q, page } = listBillsQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  const conditions = [
    eq(bills.userId, userId),
    eq(bills.status, 'COMPLETED'),
  ];
  if (q && q.trim()) conditions.push(like(bills.title, `%${q.trim()}%`));
  const where = and(...conditions);

  const rows = await db
    .select()
    .from(bills)
    .where(where)
    .orderBy(desc(bills.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(bills)
    .where(where);

  // Attach the snapshot participant names for each bill row.
  const ids = rows.map((r) => r.id);
  const parts = ids.length
    ? await db
        .select({
          billId: billParticipants.billId,
          name: billParticipants.nameSnapshot,
        })
        .from(billParticipants)
        .where(inArray(billParticipants.billId, ids))
    : [];
  const byBill = new Map<string, string[]>();
  for (const p of parts) {
    const arr = byBill.get(p.billId) ?? [];
    arr.push(p.name);
    byBill.set(p.billId, arr);
  }

  const data = rows.map((r) => ({
    ...r,
    participantNames: byBill.get(r.id) ?? [],
  }));

  return jsonOk({ bills: data, total, page });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const body = await parseJson(req, saveBillRequestSchema);

  const billId = await persistBill(userId, body);
  return jsonOk({ bill: { id: billId } }, { status: 201 });
});
