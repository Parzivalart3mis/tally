import { drizzle } from 'drizzle-orm/libsql';
import { createClient, type Client } from '@libsql/client';
import * as schema from './schema';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// A single client per server runtime. Local dev points at a plain SQLite file
// (no token); hosted Turso needs the auth token.
const client: Client = createClient(
  authToken ? { url, authToken } : { url },
);

export const db = drizzle(client, { schema });
export { schema };
export type DB = typeof db;
