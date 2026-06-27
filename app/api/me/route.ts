import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, people } from '@/db/schema';
import { route, jsonOk, parseJson, errors } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { setSelfSchema } from '@/lib/schemas';

// Always run the function; never serve a cached (edge) response.
export const dynamic = 'force-dynamic';

// Designate (or clear) which roster person is "me".
export const PATCH = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { selfPersonId } = await parseJson(req, setSelfSchema);

  if (selfPersonId) {
    const [p] = await db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.id, selfPersonId), eq(people.userId, userId)));
    if (!p) throw errors.notFound('Person');
  }

  await db.update(users).set({ selfPersonId }).where(eq(users.id, userId));
  return jsonOk({ ok: true, selfPersonId });
});
