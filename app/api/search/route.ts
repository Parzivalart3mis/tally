import { and, desc, eq, like } from 'drizzle-orm';
import { db } from '@/db';
import { bills, people } from '@/db/schema';
import { route, jsonOk } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { searchQuerySchema } from '@/lib/schemas';

export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  const { q } = searchQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  if (!q) return jsonOk({ bills: [], people: [] });

  const term = `%${q}%`;

  const billRows = await db
    .select({
      id: bills.id,
      title: bills.title,
      grandTotalCents: bills.grandTotalCents,
      createdAt: bills.createdAt,
      receiptImageUrl: bills.receiptImageUrl,
    })
    .from(bills)
    .where(
      and(
        eq(bills.userId, userId),
        eq(bills.status, 'COMPLETED'),
        like(bills.title, term),
      ),
    )
    .orderBy(desc(bills.createdAt))
    .limit(8);

  const peopleRows = await db
    .select({ id: people.id, name: people.name, archived: people.archived })
    .from(people)
    .where(
      and(
        eq(people.userId, userId),
        eq(people.archived, false),
        like(people.name, term),
      ),
    )
    .limit(8);

  return jsonOk({ bills: billRows, people: peopleRows });
});
