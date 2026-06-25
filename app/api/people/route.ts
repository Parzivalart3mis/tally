import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { people } from '@/db/schema';
import { route, jsonOk, parseJson } from '@/lib/api';
import { requireUserId, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createPersonSchema } from '@/lib/schemas';

export const GET = route(async (req: Request) => {
  const userId = await requireUserId();
  const includeArchived =
    new URL(req.url).searchParams.get('includeArchived') === 'true';

  const rows = await db
    .select()
    .from(people)
    .where(
      includeArchived
        ? eq(people.userId, userId)
        : and(eq(people.userId, userId), eq(people.archived, false)),
    )
    .orderBy(asc(people.name));

  return jsonOk({ people: rows });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { name } = await parseJson(req, createPersonSchema);

  const [person] = await db
    .insert(people)
    .values({ userId, name })
    .returning();

  return jsonOk({ person }, { status: 201 });
});
