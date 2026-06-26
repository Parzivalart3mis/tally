import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '@/db/schema';

// One in-memory libSQL database for the integration suite — no Docker.
export const client = createClient({ url: ':memory:' });
export const testDb = drizzle(client, { schema });

export async function migrateTestDb() {
  await migrate(testDb, { migrationsFolder: 'db/migrations' });
}

export async function resetTestDb() {
  await client.executeMultiple(
    [
      'DELETE FROM item_assignments;',
      'DELETE FROM bill_items;',
      'DELETE FROM bill_participants;',
      'DELETE FROM bills;',
      'DELETE FROM presets;',
      'DELETE FROM people;',
      'DELETE FROM users;',
    ].join('\n'),
  );
}

export async function seedUser(id: string, email = `${id}@test.local`) {
  await testDb
    .insert(schema.users)
    .values({ id, email })
    .onConflictDoNothing();
}
