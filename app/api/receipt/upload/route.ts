import { put } from '@vercel/blob';
import { createId } from '@paralleldrive/cuid2';
import sharp from 'sharp';
import { route, jsonOk, errors } from '@/lib/api';
import { requireUser } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const MAX_BYTES = 12 * 1024 * 1024; // 12MB raw upload (phone photos run large)

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
    throw errors.payload('Image must be under 12MB.');
  }

  // Normalize to a clean, model-friendly JPEG: decode any format (incl. HEIC),
  // honor EXIF orientation, and downscale large phone photos. This is what
  // makes the vision models reliable — raw HEIC / huge JPEGs make them fail.
  const inputBuf = Buffer.from(await file.arrayBuffer());
  let outBuf: Buffer;
  let contentType = 'image/jpeg';
  let ext = 'jpg';
  try {
    outBuf = await sharp(inputBuf, { failOn: 'none' })
      .rotate() // apply EXIF orientation
      .resize({
        width: 1600,
        height: 1600,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    // Could not process — keep the original bytes so upload still succeeds.
    outBuf = inputBuf;
    contentType = file.type;
    ext = (file.name.split('.').pop() || 'jpg').toLowerCase().slice(0, 5);
  }

  const blob = await put(`receipts/${userId}/${createId()}.${ext}`, outBuf, {
    access: 'public',
    token,
    contentType,
    addRandomSuffix: false,
  });

  return jsonOk({ blobUrl: blob.url }, { status: 201 });
});
