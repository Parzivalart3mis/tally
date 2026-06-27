import 'server-only';
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  like,
  lte,
} from 'drizzle-orm';
import { db } from '@/db';
import {
  bills,
  billParticipants,
  billItems,
  itemAssignments,
  people,
  presets,
  users,
} from '@/db/schema';

export const BILLS_PAGE_SIZE = 12;

export type BillListItem = Awaited<
  ReturnType<typeof listBills>
>['bills'][number];

export interface BillFilters {
  q?: string;
  page?: number;
  tag?: string;
  person?: string;
  dateFrom?: Date;
  dateTo?: Date;
  minCents?: number;
  maxCents?: number;
}

/** Paginated, user-scoped bill history with snapshot participant names. */
export async function listBills(userId: string, opts: BillFilters = {}) {
  const page = opts.page && opts.page > 0 ? opts.page : 1;
  const conditions = [eq(bills.userId, userId), eq(bills.status, 'COMPLETED')];
  if (opts.q && opts.q.trim()) {
    conditions.push(like(bills.title, `%${opts.q.trim()}%`));
  }
  if (opts.tag && opts.tag.trim()) {
    // tags are stored as a JSON array, e.g. ["dinner","trip"]
    conditions.push(like(bills.tags, `%"${opts.tag.trim().toLowerCase()}"%`));
  }
  if (opts.person && opts.person.trim()) {
    conditions.push(
      inArray(
        bills.id,
        db
          .select({ billId: billParticipants.billId })
          .from(billParticipants)
          .where(eq(billParticipants.nameSnapshot, opts.person.trim())),
      ),
    );
  }
  if (opts.dateFrom) conditions.push(gte(bills.createdAt, opts.dateFrom));
  if (opts.dateTo) conditions.push(lte(bills.createdAt, opts.dateTo));
  if (opts.minCents != null)
    conditions.push(gte(bills.grandTotalCents, opts.minCents));
  if (opts.maxCents != null)
    conditions.push(lte(bills.grandTotalCents, opts.maxCents));
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

/** All completed bills with their participants + items, for data export. */
export async function getBillsForExport(userId: string) {
  const billRows = await db
    .select()
    .from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.status, 'COMPLETED')))
    .orderBy(desc(bills.createdAt));
  const ids = billRows.map((b) => b.id);
  const parts = ids.length
    ? await db
        .select()
        .from(billParticipants)
        .where(inArray(billParticipants.billId, ids))
        .orderBy(asc(billParticipants.nameSnapshot))
    : [];
  const items = ids.length
    ? await db
        .select()
        .from(billItems)
        .where(inArray(billItems.billId, ids))
        .orderBy(asc(billItems.position))
    : [];

  const group = <T extends { billId: string }>(rows: T[]) => {
    const m = new Map<string, T[]>();
    for (const r of rows) {
      const arr = m.get(r.billId) ?? [];
      arr.push(r);
      m.set(r.billId, arr);
    }
    return m;
  };
  const pBy = group(parts);
  const iBy = group(items);

  return billRows.map((b) => ({
    ...b,
    participants: pBy.get(b.id) ?? [],
    items: iBy.get(b.id) ?? [],
  }));
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

/** Distinct tags used across the user's bills, sorted. */
export async function getUsedTags(userId: string): Promise<string[]> {
  const rows = await db
    .select({ tags: bills.tags })
    .from(bills)
    .where(eq(bills.userId, userId));
  const set = new Set<string>();
  for (const r of rows) for (const t of r.tags ?? []) set.add(t);
  return [...set].sort();
}

/** The roster person the user marked as "me" (or null). */
export async function getSelfPersonId(userId: string): Promise<string | null> {
  const [u] = await db
    .select({ selfPersonId: users.selfPersonId })
    .from(users)
    .where(eq(users.id, userId));
  return u?.selfPersonId ?? null;
}

export async function listPresets(userId: string) {
  return db
    .select()
    .from(presets)
    .where(eq(presets.userId, userId))
    .orderBy(asc(presets.name));
}
