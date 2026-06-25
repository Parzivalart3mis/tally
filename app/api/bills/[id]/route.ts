import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/db';
import {
  bills,
  billParticipants,
  billItems,
  itemAssignments,
} from '@/db/schema';
import { route, jsonOk, errors } from '@/lib/api';
import { requireUserId, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUserId();
  const { id } = await ctx.params;

  const [bill] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, userId)));
  if (!bill) throw errors.notFound('Bill');

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

  return jsonOk({ bill, participants, items, assignments });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { id } = await ctx.params;

  // Scoped delete; children cascade.
  const [deleted] = await db
    .delete(bills)
    .where(and(eq(bills.id, id), eq(bills.userId, userId)))
    .returning({ id: bills.id });

  if (!deleted) throw errors.notFound('Bill');
  return jsonOk({ ok: true });
});
