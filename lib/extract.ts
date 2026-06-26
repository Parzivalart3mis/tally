/** Receipt extraction: Claude vision (Claude + Exact engines) or Groq vision. */
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import {
  extractedReceiptSchema,
  type ExtractedReceiptDto,
} from '@/lib/schemas/bills';
import type { SplitEngineId } from '@/lib/types';
import { EXTRACT_PROMPT } from '@/lib/prompts';
import { errors } from '@/lib/api';

const ALLOWED_MEDIA = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;
type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

/** Fetch a public blob image and return it base64-encoded for Claude vision. */
async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: AllowedMedia }> {
  const res = await fetch(url);
  if (!res.ok) throw errors.upstream('Could not fetch the receipt image.');
  const contentType = (res.headers.get('content-type') ?? '')
    .split(';')[0]
    ?.trim();
  const mediaType: AllowedMedia = (
    ALLOWED_MEDIA as readonly string[]
  ).includes(contentType ?? '')
    ? (contentType as AllowedMedia)
    : 'image/jpeg';
  const buf = Buffer.from(await res.arrayBuffer());
  return { data: buf.toString('base64'), mediaType };
}

const RECEIPT_JSON_SCHEMA = {
  type: 'object' as const,
  properties: {
    merchant: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          unitPrice: { type: 'number' },
          qty: { type: 'number' },
          lineTotal: { type: 'number' },
          lowConfidence: { type: 'boolean' },
        },
        required: ['name', 'unitPrice', 'qty', 'lineTotal'],
      },
    },
    totals: {
      type: 'object',
      properties: {
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        service: { type: 'number' },
        tip: { type: 'number' },
        extras: { type: 'number' },
        discount: { type: 'number' },
        grandTotal: { type: 'number' },
      },
      required: [
        'subtotal',
        'tax',
        'service',
        'tip',
        'extras',
        'discount',
        'grandTotal',
      ],
    },
  },
  required: ['items', 'totals'],
};

/**
 * Route extraction to a vision model by engine:
 *   - Claude engine  → Claude vision (accurate, paid)
 *   - Groq engine    → Groq vision (free, weaker)
 *   - Exact (default)→ Gemini Flash (free + accurate); falls back to Claude if
 *                      GEMINI_API_KEY isn't set. Groq is not used for Exact.
 */
export async function extractReceipt(
  blobUrl: string,
  engine: SplitEngineId,
): Promise<ExtractedReceiptDto> {
  let raw: unknown;
  if (engine === 'CLAUDE_PROMPT') {
    raw = await extractWithClaude(blobUrl);
  } else if (engine === 'GROQ') {
    raw = await extractWithGroq(blobUrl);
  } else {
    // EXACT (default): prefer Gemini Flash (free + accurate). If it isn't
    // configured, or fails (e.g. free-tier rate limit / quota), fall back to
    // accurate Claude so the default flow always works. Groq is not used here.
    if (process.env.GEMINI_API_KEY) {
      try {
        raw = await extractWithGemini(blobUrl);
      } catch (err) {
        console.warn('[extract] Gemini failed; falling back to Claude:', err);
        raw = await extractWithClaude(blobUrl);
      }
    } else {
      raw = await extractWithClaude(blobUrl);
    }
  }
  // Validate/normalize whatever the model returned.
  return extractedReceiptSchema.parse(raw);
}

/** Gemini Flash via its OpenAI-compatible endpoint (no extra SDK needed). */
async function extractWithGemini(blobUrl: string): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw errors.upstream('GEMINI_API_KEY is not configured.');
  const model = process.env.GEMINI_VISION_MODEL ?? 'gemini-2.5-flash';

  // Send the (already sharp-normalized) image as a base64 data URI.
  const { data, mediaType } = await fetchImageAsBase64(blobUrl);
  const dataUri = `data:${mediaType};base64,${data}`;

  let res: Response;
  try {
    res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `${EXTRACT_PROMPT}\n\nReturn a JSON object with keys "merchant", "items" (array of {name, unitPrice, qty, lineTotal, lowConfidence}), and "totals" {subtotal, tax, service, tip, extras, discount, grandTotal}.`,
                },
                { type: 'image_url', image_url: { url: dataUri } },
              ],
            },
          ],
        }),
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    throw errors.upstream(`Gemini vision (${model}) request failed: ${msg}`);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw errors.upstream(
      `Gemini vision (${model}) failed: ${res.status} ${body.slice(0, 200)}`,
    );
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw errors.upstream('Gemini returned an empty response.');
  try {
    return JSON.parse(text);
  } catch {
    throw errors.upstream('Gemini did not return valid JSON.');
  }
}

async function extractWithClaude(blobUrl: string): Promise<unknown> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw errors.upstream('ANTHROPIC_API_KEY is not configured.');
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });
  const { data, mediaType } = await fetchImageAsBase64(blobUrl);

  let msg;
  try {
    msg = await client.messages.create({
      model,
      max_tokens: 2048,
      tools: [
        {
          name: 'record_receipt',
          description:
            'Record the line items and totals read from the receipt.',
          input_schema: RECEIPT_JSON_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'record_receipt' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data },
            },
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        },
      ],
    });
  } catch (e) {
    const detail = e instanceof Error ? e.message : 'unknown error';
    throw errors.upstream(`Claude vision (${model}) failed: ${detail}`);
  }

  const block = msg.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw errors.upstream('Claude did not return structured receipt data.');
  }
  return block.input;
}

async function extractWithGroq(blobUrl: string): Promise<unknown> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw errors.upstream('GROQ_API_KEY is not configured.');
  const model =
    process.env.GROQ_VISION_MODEL ?? 'meta-llama/llama-4-scout-17b-16e-instruct';
  const client = new Groq({ apiKey });

  let res;
  try {
    res = await client.chat.completions.create({
      model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${EXTRACT_PROMPT}\n\nReturn a JSON object with keys "merchant", "items" (array of {name, unitPrice, qty, lineTotal, lowConfidence}), and "totals" {subtotal, tax, service, tip, extras, discount, grandTotal}.`,
            },
            { type: 'image_url', image_url: { url: blobUrl } },
          ],
        },
      ],
    });
  } catch (e) {
    // Surface the real reason (model/vision/size error) instead of a 500.
    const msg = e instanceof Error ? e.message : 'unknown error';
    throw errors.upstream(`Groq vision (${model}) failed: ${msg}`);
  }

  const text = res.choices[0]?.message?.content;
  if (!text) throw errors.upstream('Groq returned an empty response.');
  try {
    return JSON.parse(text);
  } catch {
    throw errors.upstream('Groq did not return valid JSON.');
  }
}
