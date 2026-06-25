import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { presets } from '@/db/schema';
import { route, jsonOk, parseJson } from '@/lib/api';
import { requireUserId, requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { createPresetSchema } from '@/lib/schemas';

export const GET = route(async () => {
  const userId = await requireUserId();
  const rows = await db
    .select()
    .from(presets)
    .where(eq(presets.userId, userId))
    .orderBy(asc(presets.name));
  return jsonOk({ presets: rows });
});

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);
  const { name, memberIds } = await parseJson(req, createPresetSchema);

  const [preset] = await db
    .insert(presets)
    .values({ userId, name, memberIds })
    .returning();

  return jsonOk({ preset }, { status: 201 });
});
