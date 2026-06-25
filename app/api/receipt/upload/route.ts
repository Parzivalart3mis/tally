import { put } from '@vercel/blob';
import { createId } from '@paralleldrive/cuid2';
import { route, jsonOk, errors } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export const POST = route(async (req: Request) => {
  const userId = await requireUser();
  await enforceRateLimit('write', userId);

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw errors.upstream('Blob storage is not configured.');

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw errors.badRequest('No image uploaded.');
  if (!file.type.startsWith('image/')) {
    throw errors.badRequest('Only image files are allowed.');
  }
  if (file.size > MAX_BYTES) {
    throw errors.payload('Image must be under 10MB.');
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  const blob = await put(`receipts/${userId}/${createId()}.${ext}`, file, {
    access: 'public',
    token,
    contentType: file.type,
    addRandomSuffix: false,
  });

  return jsonOk({ blobUrl: blob.url }, { status: 201 });
});
