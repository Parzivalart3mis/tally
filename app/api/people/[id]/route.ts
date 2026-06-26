import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { people } from '@/db/schema';
import { route, jsonOk, parseJson, errors } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { updatePersonSchema } from '@/lib/schemas';

// Always run the function; never serve a cached (edge) response.
export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { id } = await ctx.params;
  const data = await parseJson(req, updatePersonSchema);

  const [person] = await db
    .update(people)
    .set(data)
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .returning();

  if (!person) throw errors.notFound('Person');
  return jsonOk({ person });
});

// Soft delete: archive rather than remove, so past bills keep their snapshot.
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { id } = await ctx.params;

  const [person] = await db
    .update(people)
    .set({ archived: true })
    .where(and(eq(people.id, id), eq(people.userId, userId)))
    .returning();

  if (!person) throw errors.notFound('Person');
  return jsonOk({ ok: true });
});
