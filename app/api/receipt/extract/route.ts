import { route, jsonOk, parseJson } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';
import { extractRequestSchema } from '@/lib/schemas';
import { extractReceipt } from '@/lib/extract';

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('extract', userId);
  const { blobUrl, engine } = await parseJson(req, extractRequestSchema);

  const receipt = await extractReceipt(blobUrl, engine);
  return jsonOk({
    merchant: receipt.merchant ?? null,
    items: receipt.items,
    totals: receipt.totals,
  });
});
