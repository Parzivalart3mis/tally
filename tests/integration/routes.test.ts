import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from 'vitest';

// Mutable current-user for the auth mock.
const authState = vi.hoisted(() => ({ userId: 'userA' }));

vi.mock('@/lib/auth', () => ({
  requireUserId: async () => authState.userId,
  requireUser: async () => authState.userId,
}));
vi.mock('@/lib/ratelimit', () => ({
  enforceRateLimit: async () => {},
}));
// The mock factory OWNS the test db — the single instance route handlers
// import. A throwaway temp file is used instead of ':memory:', which under
// vitest's worker pool does not reliably survive across this file's tests with
// the libsql native client. The file is deleted in afterAll. Still no Docker.
vi.mock('@/db', async () => {
  const { drizzle } = await import('drizzle-orm/libsql');
  const { createClient } = await import('@libsql/client');
  const os = await import('node:os');
  const path = await import('node:path');
  const fs = await import('node:fs');
  const schema = await import('@/db/schema');
  const file = path.join(
    os.tmpdir(),
    `tally-test-${process.pid}-${Date.now()}.db`,
  );
  fs.rmSync(file, { force: true });
  const client = createClient({ url: `file:${file}` });
  return { db: drizzle(client, { schema }), schema, __file: file };
});

import * as dbModule from '@/db';
import { rmSync } from 'node:fs';
import { migrateInto, resetDb, seedUser } from './setup';
import { jsonRequest, params, buildSaveBill, item, totals } from './helpers';
import { billParticipants } from '@/db/schema';
import { eq } from 'drizzle-orm';

const testDb = dbModule.db;

// Route handlers under test.
import { GET as getPeople, POST as postPerson } from '@/app/api/people/route';
import {
  PATCH as patchPerson,
  DELETE as deletePerson,
} from '@/app/api/people/[id]/route';
import { GET as listBills, POST as saveBill } from '@/app/api/bills/route';
import {
  GET as getBill,
  DELETE as deleteBill,
} from '@/app/api/bills/[id]/route';
import { POST as compute } from '@/app/api/bills/compute/route';

function as(user: string) {
  authState.userId = user;
}

beforeAll(async () => {
  await migrateInto(testDb);
});

afterAll(() => {
  const file = (dbModule as unknown as { __file?: string }).__file;
  if (file) rmSync(file, { force: true });
});

beforeEach(async () => {
  await resetDb(testDb);
  await seedUser(testDb, 'userA');
  await seedUser(testDb, 'userB');
  as('userA');
});

async function body<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

describe('people · cross-user isolation', () => {
  it('user B cannot see, patch, or delete user A’s person', async () => {
    as('userA');
    const created = await postPerson(
      jsonRequest('/api/people', 'POST', { name: 'Alice' }),
    );
    expect(created.status).toBe(201);
    const { person } = await body<{ person: { id: string } }>(created);

    // userB list excludes Alice
    as('userB');
    const list = await getPeople(jsonRequest('/api/people', 'GET'));
    const { people } = await body<{ people: unknown[] }>(list);
    expect(people).toHaveLength(0);

    // userB cannot patch userA's person
    const patched = await patchPerson(
      jsonRequest(`/api/people/${person.id}`, 'PATCH', { name: 'Hacked' }),
      params(person.id),
    );
    expect(patched.status).toBe(404);

    // userB cannot delete it
    const del = await deletePerson(
      jsonRequest(`/api/people/${person.id}`, 'DELETE'),
      params(person.id),
    );
    expect(del.status).toBe(404);

    // userA still sees the unchanged person
    as('userA');
    const listA = await getPeople(jsonRequest('/api/people', 'GET'));
    const { people: peopleA } = await body<{
      people: { name: string }[];
    }>(listA);
    expect(peopleA).toHaveLength(1);
    expect(peopleA[0]!.name).toBe('Alice');
  });
});

describe('bills · cross-user isolation', () => {
  it('user B cannot read or delete user A’s bill', async () => {
    as('userA');
    const payload = buildSaveBill(
      'Dinner',
      [item('Pizza', 2000, ['Alice', 'Bob'])],
      totals({ subtotalCents: 2000, grandTotalCents: 2000 }),
      ['Alice', 'Bob'],
    );
    const saved = await saveBill(jsonRequest('/api/bills', 'POST', payload));
    expect(saved.status).toBe(201);
    const { bill } = await body<{ bill: { id: string } }>(saved);

    as('userB');
    const detail = await getBill(
      jsonRequest(`/api/bills/${bill.id}`, 'GET'),
      params(bill.id),
    );
    expect(detail.status).toBe(404);

    const del = await deleteBill(
      jsonRequest(`/api/bills/${bill.id}`, 'DELETE'),
      params(bill.id),
    );
    expect(del.status).toBe(404);

    // still there for userA
    as('userA');
    const ok = await getBill(
      jsonRequest(`/api/bills/${bill.id}`, 'GET'),
      params(bill.id),
    );
    expect(ok.status).toBe(200);
  });
});

describe('archiving a person leaves past bills untouched', () => {
  it('keeps nameSnapshot and totals after the person is archived', async () => {
    as('userA');
    // roster person
    const created = await postPerson(
      jsonRequest('/api/people', 'POST', { name: 'Alice' }),
    );
    const { person } = await body<{ person: { id: string } }>(created);

    // a bill that includes Alice
    const payload = buildSaveBill(
      'Lunch',
      [item('Salad', 1000, ['Alice', 'Bob'])],
      totals({ subtotalCents: 1000, grandTotalCents: 1000 }),
      ['Alice', 'Bob'],
    );
    const saved = await saveBill(jsonRequest('/api/bills', 'POST', payload));
    const { bill } = await body<{ bill: { id: string } }>(saved);

    // snapshot before archive
    const before = await testDb
      .select()
      .from(billParticipants)
      .where(eq(billParticipants.billId, bill.id));
    const aliceBefore = before.find((p) => p.nameSnapshot === 'Alice')!;
    expect(aliceBefore.totalCents).toBe(500);

    // archive Alice (soft delete)
    const del = await deletePerson(
      jsonRequest(`/api/people/${person.id}`, 'DELETE'),
      params(person.id),
    );
    expect(del.status).toBe(200);

    // person no longer in active roster
    const list = await getPeople(jsonRequest('/api/people', 'GET'));
    const { people } = await body<{ people: unknown[] }>(list);
    expect(people).toHaveLength(0);

    // but the bill snapshot is identical
    const after = await testDb
      .select()
      .from(billParticipants)
      .where(eq(billParticipants.billId, bill.id));
    const aliceAfter = after.find((p) => p.nameSnapshot === 'Alice')!;
    expect(aliceAfter.nameSnapshot).toBe('Alice');
    expect(aliceAfter.totalCents).toBe(aliceBefore.totalCents);

    // and the detail endpoint still returns Alice's name
    const detail = await getBill(
      jsonRequest(`/api/bills/${bill.id}`, 'GET'),
      params(bill.id),
    );
    const { participants } = await body<{
      participants: { nameSnapshot: string }[];
    }>(detail);
    expect(participants.map((p) => p.nameSnapshot)).toContain('Alice');
  });
});

describe('compute route', () => {
  it('Engine C returns a reconciling SplitResult', async () => {
    as('userA');
    const res = await compute(
      jsonRequest('/api/bills/compute', 'POST', {
        engine: 'EXACT_CODE',
        items: [
          {
            name: 'Pizza',
            unitPriceCents: 1000,
            qty: 1,
            lineTotalCents: 1000,
          },
        ],
        totals: totals({ subtotalCents: 1000, taxCents: 100, grandTotalCents: 1100 }),
        assignments: [['Alice', 'Bob', 'Carol']],
        participantNames: ['Alice', 'Bob', 'Carol'],
      }),
    );
    expect(res.status).toBe(200);
    const { result } = await body<{
      result: {
        participants: { name: string; total: number }[];
        sumCheck: { match: boolean; participantSum: number; grandTotal: number };
      };
    }>(res);
    expect(result.participants).toHaveLength(3);
    expect(result.sumCheck.match).toBe(true);
    expect(result.sumCheck.participantSum).toBe(1100);
  });

  it('rejects an item assigned to nobody', async () => {
    as('userA');
    const res = await compute(
      jsonRequest('/api/bills/compute', 'POST', {
        engine: 'EXACT_CODE',
        items: [
          { name: 'X', unitPriceCents: 500, qty: 1, lineTotalCents: 500 },
        ],
        totals: totals({ grandTotalCents: 500 }),
        assignments: [[]], // empty -> invalid
        participantNames: ['Alice'],
      }),
    );
    expect(res.status).toBe(400);
  });
});
