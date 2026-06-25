import { defineConfig } from 'drizzle-kit';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// Local dev uses a plain SQLite file (dialect 'sqlite'). Hosted Turso (a
// libsql:// url + token) uses the first-class 'turso' dialect.
export default authToken
  ? defineConfig({
      schema: './db/schema.ts',
      out: './db/migrations',
      dialect: 'turso',
      dbCredentials: { url, authToken },
      verbose: true,
      strict: true,
    })
  : defineConfig({
      schema: './db/schema.ts',
      out: './db/migrations',
      dialect: 'sqlite',
      dbCredentials: { url },
      verbose: true,
      strict: true,
    });
