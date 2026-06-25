/**
 * Seed: one demo user, a roster (Yash, Prakriti, Vishesh), two presets, and
 * two completed bills computed by the exact engine — so history isn't empty.
 *
 * Idempotent: re-running wipes and recreates the demo user's data.
 *
 * To see this data when signed in with real Clerk, set SEED_USER_ID to your
 * Clerk user id before running `pnpm db:seed`.
 */
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from './index';
import { users, people, presets } from './schema';
import { computeExactSplit } from '@/lib/split';
import { persistBill } from '@/lib/persist-bill';
import type { ComputeItem, ComputeTotals } from '@/lib/types';
import type { SaveBillRequest } from '@/lib/schemas/bills';

const USER_ID = process.env.SEED_USER_ID ?? 'demo-user';
const USER_EMAIL = process.env.SEED_USER_EMAIL ?? 'demo@tally.app';

function buildSave(
  engine: SaveBillRequest['engine'],
  title: string,
  items: ComputeItem[],
  totals: ComputeTotals,
  participantNames: string[],
): SaveBillRequest {
  const result = computeExactSplit({ items, totals, participantNames });
  return {
    title,
    engine,
    receiptImageUrl: null,
    currency: 'USD',
    items: items.map((i) => ({
      name: i.name,
      unitPriceCents: i.unitPriceCents,
      qty: i.qty,
      lineTotalCents: i.lineTotalCents,
    })),
    totals,
    assignments: items.map((i) => i.sharedBy),
    participantNames,
    result,
  };
}

async function main() {
  console.log(`Seeding demo data for user "${USER_ID}"…`);

  // Upsert user.
  await db
    .insert(users)
    .values({ id: USER_ID, email: USER_EMAIL })
    .onConflictDoNothing();

  // Wipe prior demo data (bills cascade to participants/items/assignments).
  const { bills } = await import('./schema');
  await db.delete(bills).where(eq(bills.userId, USER_ID));
  await db.delete(people).where(eq(people.userId, USER_ID));
  await db.delete(presets).where(eq(presets.userId, USER_ID));

  // Roster.
  const yash = { id: createId(), userId: USER_ID, name: 'Yash' };
  const prakriti = { id: createId(), userId: USER_ID, name: 'Prakriti' };
  const vishesh = { id: createId(), userId: USER_ID, name: 'Vishesh' };
  await db.insert(people).values([yash, prakriti, vishesh]);

  // Presets.
  await db.insert(presets).values([
    {
      userId: USER_ID,
      name: 'Everyone',
      memberIds: [yash.id, prakriti.id, vishesh.id],
    },
    {
      userId: USER_ID,
      name: 'Yash + Prakriti',
      memberIds: [yash.id, prakriti.id],
    },
  ]);

  // ── Bill 1: grocery split between Yash and Prakriti ──────────────────
  const groceryItems: ComputeItem[] = [
    li('Avocados', 599, ['Yash', 'Prakriti']),
    li('Sourdough loaf', 650, ['Yash']),
    li('Oat milk', 499, ['Prakriti']),
    li('Eggs, dozen', 729, ['Yash', 'Prakriti']),
  ];
  const grocerySubtotal = sum(groceryItems);
  const grocery = buildSave(
    'EXACT_CODE',
    'Whole Foods Market',
    groceryItems,
    cents({ subtotalCents: grocerySubtotal, grandTotalCents: grocerySubtotal }),
    ['Yash', 'Prakriti'],
  );
  await persistBill(USER_ID, grocery, {
    createdAt: daysAgo(9),
  });

  // ── Bill 2: restaurant split across all three, tax + tip ─────────────
  const dinnerItems: ComputeItem[] = [
    li('Margherita pizza', 1800, ['Yash', 'Prakriti', 'Vishesh']),
    li('Caesar salad', 1200, ['Prakriti', 'Vishesh']),
    li('Spaghetti carbonara', 1650, ['Yash']),
    li('Tiramisu', 950, ['Yash', 'Prakriti', 'Vishesh']),
    li('Sparkling water', 600, ['Yash', 'Prakriti', 'Vishesh']),
  ];
  const dinnerSubtotal = sum(dinnerItems); // 6200
  const dinnerTax = 527; // ~8.5%
  const dinnerTip = 1240; // 20%
  const dinner = buildSave(
    'EXACT_CODE',
    'Trattoria Sofia',
    dinnerItems,
    cents({
      subtotalCents: dinnerSubtotal,
      taxCents: dinnerTax,
      tipCents: dinnerTip,
      grandTotalCents: dinnerSubtotal + dinnerTax + dinnerTip,
    }),
    ['Yash', 'Prakriti', 'Vishesh'],
  );
  await persistBill(USER_ID, dinner, { createdAt: daysAgo(2) });

  console.log('Seed complete: 3 people, 2 presets, 2 bills.');
}

function li(name: string, lineTotalCents: number, sharedBy: string[]): ComputeItem {
  return { name, unitPriceCents: lineTotalCents, qty: 1, lineTotalCents, sharedBy };
}
function sum(items: ComputeItem[]): number {
  return items.reduce((s, i) => s + i.lineTotalCents, 0);
}
function cents(t: Partial<ComputeTotals>): ComputeTotals {
  return {
    subtotalCents: 0,
    taxCents: 0,
    serviceCents: 0,
    tipCents: 0,
    extrasCents: 0,
    discountCents: 0,
    grandTotalCents: 0,
    ...t,
  };
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
