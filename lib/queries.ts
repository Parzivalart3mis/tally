import 'server-only';
import { and, asc, count, desc, eq, inArray, like } from 'drizzle-orm';
import { db } from '@/db';
import {
  bills,
  billParticipants,
  billItems,
  itemAssignments,
  people,
  presets,
} from '@/db/schema';

export const BILLS_PAGE_SIZE = 12;

export type BillListItem = Awaited<
  ReturnType<typeof listBills>
>['bills'][number];

/** Paginated, user-scoped bill history with snapshot participant names. */
export async function listBills(
  userId: string,
  opts: { q?: string; page?: number } = {},
) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const conditions = [eq(bills.userId, userId), eq(bills.status, 'COMPLETED')];
  if (opts.q && opts.q.trim()) {
    conditions.push(like(bills.title, `%${opts.q.trim()}%`));
  }
  const where = and(...conditions);

  const rows = await db
    .select()
    .from(bills)
    .where(where)
    .orderBy(desc(bills.createdAt))
    .limit(BILLS_PAGE_SIZE)
    .offset((page - 1) * BILLS_PAGE_SIZE);

  const [{ total } = { total: 0 }] = await db
    .select({ total: count() })
    .from(bills)
    .where(where);

  const ids = rows.map((r) => r.id);
  const parts = ids.length
    ? await db
        .select({
          billId: billParticipants.billId,
          name: billParticipants.nameSnapshot,
        })
        .from(billParticipants)
        .where(inArray(billParticipants.billId, ids))
        .orderBy(asc(billParticipants.nameSnapshot))
    : [];

  const byBill = new Map<string, string[]>();
  for (const p of parts) {
    const arr = byBill.get(p.billId) ?? [];
    arr.push(p.name);
    byBill.set(p.billId, arr);
  }

  return {
    bills: rows.map((r) => ({
      ...r,
      participantNames: byBill.get(r.id) ?? [],
    })),
    total,
    page,
  };
}

/** Full bill detail (snapshot), user-scoped. Returns null if not found. */
export async function getBillDetail(userId: string, id: string) {
  const [bill] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, userId)));
  if (!bill) return null;

  const participants = await db
    .select()
    .from(billParticipants)
    .where(eq(billParticipants.billId, id))
    .orderBy(asc(billParticipants.nameSnapshot));

  const items = await db
    .select()
    .from(billItems)
    .where(eq(billItems.billId, id))
    .orderBy(asc(billItems.position));

  const itemIds = items.map((i) => i.id);
  const assignments = itemIds.length
    ? await db
        .select()
        .from(itemAssignments)
        .where(inArray(itemAssignments.billItemId, itemIds))
    : [];

  return { bill, participants, items, assignments };
}

export async function listPeople(userId: string, includeArchived = false) {
  return db
    .select()
    .from(people)
    .where(
      includeArchived
        ? eq(people.userId, userId)
        : and(eq(people.userId, userId), eq(people.archived, false)),
    )
    .orderBy(asc(people.name));
}

export async function listPresets(userId: string) {
  return db
    .select()
    .from(presets)
    .where(eq(presets.userId, userId))
    .orderBy(asc(presets.name));
}
