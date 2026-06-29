/**
 * Compute routing: Engine A (Claude), Engine B (Groq), Engine C (exact code).
 * All three return the same SplitResult shape. For A and B we additionally
 * re-verify the model's arithmetic in code and rewrite the sum-check from the
 * truth, so the badge never shows a model's self-graded claim.
 */
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import { computeExactSplit, verifySplitResult } from '@/lib/split';
import { splitResultSchema } from '@/lib/schemas/bills';
import type { ComputeInput, SplitResult, SplitEngineId } from '@/lib/types';
import {
  SPLIT_SYSTEM_PROMPT,
  buildSplitUserMessage,
} from '@/lib/prompts';
import { errors } from '@/lib/api';

export interface ComputeOutput {
  result: SplitResult;
  /** Present for model engines (A/B): code re-verification of the model math. */
  verification?: {
    reconciles: boolean;
    perPersonConsistent: boolean;
    match: boolean;
  };
}

export async function computeWithEngine(
  engine: SplitEngineId,
  input: ComputeInput,
  assignments: string[][],
): Promise<ComputeOutput> {
  if (engine === 'EXACT_CODE') {
    return { result: computeExactSplit(input) };
  }

  const result =
    engine === 'GROQ'
      ? await computeWithGroq(input, assignments)
      : await computeWithClaude(input, assignments);

  // Re-verify the model's numbers in code; rewrite the sum-check from truth.
  const verification = verifySplitResult(result);
  const honest: SplitResult = {
    ...result,
    sumCheck: {
      participantSum: verification.participantSum,
      grandTotal: verification.grandTotal,
      match: verification.reconciles,
    },
  };
  return {
    result: honest,
    verification: {
      reconciles: verification.reconciles,
      perPersonConsistent: verification.perPersonConsistent,
      match: verification.match,
    },
  };
}

function userMessage(input: ComputeInput, assignments: string[][]): string {
  return buildSplitUserMessage({
    items: input.items.map((i) => ({
      name: i.name,
      unitPriceCents: i.unitPriceCents,
      qty: i.qty,
      lineTotalCents: i.lineTotalCents,
      weights: i.weights,
    })),
    assignments,
    participantNames: input.participantNames,
    instructions: input.instructions ?? null,
    totals: input.totals,
  });
}

async function computeWithClaude(
  input: ComputeInput,
  assignments: string[][],
): Promise<SplitResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw errors.upstream('ANTHROPIC_API_KEY is not configured.');
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model,
    max_tokens: 4096,
    system: SPLIT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage(input, assignments) }],
  });

  const text = msg.content
    .filter((b) => b.type === 'text')
    .map((b) => (b.type === 'text' ? b.text : ''))
    .join('\n');
  return parseSplitJson(text);
}

async function computeWithGroq(
  input: ComputeInput,
  assignments: string[][],
): Promise<SplitResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw errors.upstream('GROQ_API_KEY is not configured.');
  const model = process.env.GROQ_LOGIC_MODEL ?? 'openai/gpt-oss-120b';
  const client = new Groq({ apiKey });

  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SPLIT_SYSTEM_PROMPT },
      { role: 'user', content: userMessage(input, assignments) },
    ],
  });
  const text = res.choices[0]?.message?.content ?? '';
  return parseSplitJson(text);
}

/** Extract a JSON object from a model response and validate its shape. */
function parseSplitJson(text: string): SplitResult {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw errors.upstream('The model did not return JSON.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start, end + 1));
  } catch {
    throw errors.upstream('The model returned malformed JSON.');
  }
  return splitResultSchema.parse(parsed) as SplitResult;
}
