import { migrate } from 'drizzle-orm/libsql/migrator';
import * as schema from '@/db/schema';
import type { DB } from '@/db';

/**
 * Helpers that operate on a passed db so the in-memory database can be owned by
 * the `vi.mock('@/db')` factory (the single source of truth the route handlers
 * import). Avoids vitest's static-vs-dynamic-import duplication.
 *
 * Reset uses drizzle's own delete() (the normal execute path) rather than the
 * client's executeMultiple, which opens a separate connection to a fresh
 * in-memory db and would not see the migrated tables.
 */
export async function migrateInto(db: DB) {
  await migrate(db, { migrationsFolder: 'db/migrations' });
}

export async function resetDb(db: DB) {
  await db.delete(schema.itemAssignments);
  await db.delete(schema.billItems);
  await db.delete(schema.billParticipants);
  await db.delete(schema.bills);
  await db.delete(schema.presets);
  await db.delete(schema.people);
  await db.delete(schema.users);
}

export async function seedUser(db: DB, id: string, email = `${id}@test.local`) {
  await db.insert(schema.users).values({ id, email }).onConflictDoNothing();
}
