import { route, jsonOk, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { computeRequestSchema } from '@/lib/schemas';
import { computeWithEngine } from '@/lib/engines';
import type { ComputeInput } from '@/lib/types';

// Always run the function; never serve a cached (edge) response.
export const dynamic = 'force-dynamic';

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('compute', userId);
  const body = await parseJson(req, computeRequestSchema);

  const items = body.items.map((it, i) => ({
    name: it.name,
    unitPriceCents: it.unitPriceCents,
    qty: it.qty,
    lineTotalCents: it.lineTotalCents,
    sharedBy: body.assignments[i] ?? [],
    ...(body.weights?.[i] ? { weights: body.weights[i] } : {}),
  }));

  const input: ComputeInput = {
    items,
    totals: body.totals,
    participantNames: body.participantNames,
    instructions: body.instructions ?? null,
  };

  const out = await computeWithEngine(body.engine, input, body.assignments);
  return jsonOk({ result: out.result, verification: out.verification ?? null });
});
