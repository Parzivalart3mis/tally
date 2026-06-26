import { vi, describe, it, expect, beforeAll } from 'vitest';

// A canned, internally-consistent SplitResult the mocked models "return".
const cannedResult = {
  items: [
    {
      name: 'Pizza',
      unitPrice: 1000,
      qty: 1,
      lineTotal: 1000,
      sharedBy: ['Alice', 'Bob'],
      sharePerPerson: 500,
    },
  ],
  participants: [
    {
      name: 'Alice',
      itemShares: [{ item: 'Pizza', share: 500 }],
      subtotalBeforeTax: 500,
      taxExtrasShare: 0,
      total: 500,
    },
    {
      name: 'Bob',
      itemShares: [{ item: 'Pizza', share: 500 }],
      subtotalBeforeTax: 500,
      taxExtrasShare: 0,
      total: 500,
    },
  ],
  totals: {
    subtotal: 1000,
    tax: 0,
    service: 0,
    tip: 0,
    extras: 0,
    discount: 0,
    grandTotal: 1000,
  },
  sumCheck: { participantSum: 1000, grandTotal: 1000, match: true },
};

const cannedReceipt = {
  merchant: 'Corner Cafe',
  items: [{ name: 'Coffee', unitPrice: 3.5, qty: 1, lineTotal: 3.5 }],
  totals: {
    subtotal: 3.5,
    tax: 0,
    service: 0,
    tip: 0,
    extras: 0,
    discount: 0,
    grandTotal: 3.5,
  },
};

vi.mock('@/lib/auth', () => ({
  requireUserId: async () => 'userA',
  requireUser: async () => 'userA',
}));
vi.mock('@/lib/ratelimit', () => ({ enforceRateLimit: async () => {} }));

// Mock the model SDKs so the compute path exercises engines.ts parsing/verify.
vi.mock('groq-sdk', () => ({
  default: class Groq {
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [{ message: { content: JSON.stringify(cannedResult) } }],
        })),
      },
    };
  },
}));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    messages = {
      create: vi.fn(async () => ({
        content: [{ type: 'text', text: JSON.stringify(cannedResult) }],
      })),
    };
  },
}));

// Mock extraction directly (it is the "model call" for that route).
vi.mock('@/lib/extract', () => ({
  extractReceipt: vi.fn(async () => cannedReceipt),
}));

import { jsonRequest } from './helpers';
import { POST as compute } from '@/app/api/bills/compute/route';
import { POST as extract } from '@/app/api/receipt/extract/route';

beforeAll(() => {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  process.env.GROQ_API_KEY = 'test-key';
});

const baseCompute = {
  items: [{ name: 'Pizza', unitPriceCents: 1000, qty: 1, lineTotalCents: 1000 }],
  totals: {
    subtotalCents: 1000,
    taxCents: 0,
    serviceCents: 0,
    tipCents: 0,
    extrasCents: 0,
    discountCents: 0,
    grandTotalCents: 1000,
  },
  assignments: [['Alice', 'Bob']],
  participantNames: ['Alice', 'Bob'],
};

describe('compute · model engines return a SplitResult and are re-verified', () => {
  for (const engine of ['GROQ', 'CLAUDE_PROMPT'] as const) {
    it(`${engine} returns a verified SplitResult`, async () => {
      const res = await compute(
        jsonRequest('/api/bills/compute', 'POST', { engine, ...baseCompute }),
      );
      expect(res.status).toBe(200);
      const data = (await res.json()) as {
        result: {
          participants: { name: string; total: number }[];
          sumCheck: { match: boolean };
        };
        verification: { reconciles: boolean; match: boolean } | null;
      };
      expect(data.result.participants).toHaveLength(2);
      expect(data.result.sumCheck.match).toBe(true);
      // model paths attach a code re-verification
      expect(data.verification).not.toBeNull();
      expect(data.verification!.reconciles).toBe(true);
    });
  }
});

describe('extract · returns items and totals (model mocked)', () => {
  it('returns the read-out receipt shape', async () => {
    const res = await extract(
      jsonRequest('/api/receipt/extract', 'POST', {
        blobUrl: 'https://example.public.blob.vercel-storage.com/r.jpg',
        engine: 'CLAUDE_PROMPT',
      }),
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      merchant: string | null;
      items: { name: string }[];
      totals: { grandTotal: number };
    };
    expect(data.items).toHaveLength(1);
    expect(data.items[0]!.name).toBe('Coffee');
    expect(data.totals.grandTotal).toBe(3.5);
  });
});
