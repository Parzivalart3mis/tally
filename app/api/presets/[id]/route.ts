import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { presets } from '@/db/schema';
import { route, jsonOk, parseJson, errors } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { updatePresetSchema } from '@/lib/schemas';

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { id } = await ctx.params;
  const data = await parseJson(req, updatePresetSchema);

  const [preset] = await db
    .update(presets)
    .set(data)
    .where(and(eq(presets.id, id), eq(presets.userId, userId)))
    .returning();

  if (!preset) throw errors.notFound('Preset');
  return jsonOk({ preset });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { id } = await ctx.params;

  const [preset] = await db
    .delete(presets)
    .where(and(eq(presets.id, id), eq(presets.userId, userId)))
    .returning();

  if (!preset) throw errors.notFound('Preset');
  return jsonOk({ ok: true });
});
