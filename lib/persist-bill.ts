import { createId } from '@paralleldrive/cuid2';
import { and, eq } from 'drizzle-orm';
import { db as defaultDb, type DB } from '@/db';
import {
  bills,
  billItems,
  billParticipants,
  itemAssignments,
  people,
} from '@/db/schema';
import type { SaveBillRequest } from '@/lib/schemas/bills';

/**
 * Persist a completed bill as an immutable snapshot: the bill row, the frozen
 * participants (with their per-person results), the line items, and the
 * item→participant assignments. Runs as one atomic libSQL batch.
 *
 * The snapshot is what survives a roster person being archived: every
 * participant carries a frozen `nameSnapshot`, and `personId` is allowed to go
 * null without touching the historical name or totals.
 */
export async function persistBill(
  userId: string,
  payload: SaveBillRequest,
  opts: { db?: DB; createdAt?: Date } = {},
): Promise<string> {
  const db = opts.db ?? defaultDb;
  const { result, items, assignments, totals } = payload;

  // Map participant name -> active roster personId (null if not in roster).
  const roster = await db
    .select({ id: people.id, name: people.name })
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.archived, false)));
  const nameToPersonId = new Map(roster.map((r) => [r.name, r.id]));

  const billId = createId();

  // Participants come from the engine result (authoritative per-person totals).
  const participantRows = result.participants.map((p) => ({
    id: createId(),
    billId,
    personId: nameToPersonId.get(p.name) ?? null,
    nameSnapshot: p.name,
    subtotalCents: p.subtotalBeforeTax,
    taxExtrasCents: p.taxExtrasShare,
    totalCents: p.total,
    centAdjustment: p.centAdjustment ?? 0,
  }));
  const nameToBpId = new Map(
    participantRows.map((r) => [r.nameSnapshot, r.id]),
  );

  // Items + canonical per-item assignment shares (base each, remainder to last).
  const itemRows: (typeof billItems.$inferInsert)[] = [];
  const assignmentRows: (typeof itemAssignments.$inferInsert)[] = [];

  items.forEach((it, i) => {
    const itemId = createId();
    itemRows.push({
      id: itemId,
      billId,
      name: it.name,
      unitPriceCents: it.unitPriceCents,
      qty: it.qty,
      lineTotalCents: it.lineTotalCents,
      position: i,
    });

    const sharers = assignments[i] ?? [];
    const n = sharers.length;
    const base = n > 0 ? Math.round(it.lineTotalCents / n) : 0;
    sharers.forEach((name, j) => {
      const bpId = nameToBpId.get(name);
      if (!bpId) return;
      const share =
        j === n - 1 ? it.lineTotalCents - base * (n - 1) : base;
      assignmentRows.push({
        id: createId(),
        billItemId: itemId,
        billParticipantId: bpId,
        shareCents: share,
      });
    });
  });

  const billRow: typeof bills.$inferInsert = {
    id: billId,
    userId,
    title: payload.title ?? null,
    status: 'COMPLETED',
    engine: payload.engine,
    receiptImageUrl: payload.receiptImageUrl ?? null,
    currency: payload.currency,
    subtotalCents: totals.subtotalCents,
    taxCents: totals.taxCents,
    serviceCents: totals.serviceCents,
    tipCents: totals.tipCents,
    extrasCents: totals.extrasCents,
    discountCents: totals.discountCents,
    grandTotalCents: totals.grandTotalCents,
    sumCheckMatch: result.sumCheck.match,
    ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
  };

  // One atomic transaction (libSQL supports this on local files and Turso).
  await db.transaction(async (tx) => {
    await tx.insert(bills).values(billRow);
    await tx.insert(billParticipants).values(participantRows);
    await tx.insert(billItems).values(itemRows);
    if (assignmentRows.length > 0) {
      await tx.insert(itemAssignments).values(assignmentRows);
    }
  });

  return billId;
}
