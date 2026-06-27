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

export interface Insights {
  billCount: number;
  totalCents: number;
  avgCents: number;
  thisMonthCents: number;
  thisMonthCount: number;
  months: { label: string; cents: number }[];
  people: { name: string; totalCents: number; billCount: number }[];
  mostSplitWith: { name: string; billCount: number } | null;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Read-only spending analytics over the user's saved bills (no balances). */
export async function getInsights(userId: string): Promise<Insights> {
  const billRows = await db
    .select({
      id: bills.id,
      grandTotalCents: bills.grandTotalCents,
      createdAt: bills.createdAt,
    })
    .from(bills)
    .where(and(eq(bills.userId, userId), eq(bills.status, 'COMPLETED')));

  const ids = billRows.map((b) => b.id);
  const parts = ids.length
    ? await db
        .select({
          billId: billParticipants.billId,
          name: billParticipants.nameSnapshot,
          totalCents: billParticipants.totalCents,
        })
        .from(billParticipants)
        .where(inArray(billParticipants.billId, ids))
    : [];

  const now = new Date();
  const billCount = billRows.length;
  const totalCents = billRows.reduce((s, b) => s + b.grandTotalCents, 0);

  // last 6 months (oldest → newest)
  const buckets: { key: number; label: string; cents: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: d.getFullYear() * 12 + d.getMonth(),
      label: MONTH_LABELS[d.getMonth()] ?? '',
      cents: 0,
    });
  }
  const thisKey = now.getFullYear() * 12 + now.getMonth();
  let thisMonthCents = 0;
  let thisMonthCount = 0;
  for (const b of billRows) {
    const k = b.createdAt.getFullYear() * 12 + b.createdAt.getMonth();
    const bucket = buckets.find((x) => x.key === k);
    if (bucket) bucket.cents += b.grandTotalCents;
    if (k === thisKey) {
      thisMonthCents += b.grandTotalCents;
      thisMonthCount += 1;
    }
  }

  // per-person totals + distinct bill counts
  const byPerson = new Map<
    string,
    { totalCents: number; bills: Set<string> }
  >();
  for (const p of parts) {
    const e = byPerson.get(p.name) ?? { totalCents: 0, bills: new Set() };
    e.totalCents += p.totalCents;
    e.bills.add(p.billId);
    byPerson.set(p.name, e);
  }
  const people = [...byPerson.entries()]
    .map(([name, e]) => ({
      name,
      totalCents: e.totalCents,
      billCount: e.bills.size,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);

  const mostSplitWith = [...people].sort((a, b) => b.billCount - a.billCount)[0];

  return {
    billCount,
    totalCents,
    avgCents: billCount ? Math.round(totalCents / billCount) : 0,
    thisMonthCents,
    thisMonthCount,
    months: buckets.map((b) => ({ label: b.label, cents: b.cents })),
    people,
    mostSplitWith: mostSplitWith
      ? { name: mostSplitWith.name, billCount: mostSplitWith.billCount }
      : null,
  };
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
