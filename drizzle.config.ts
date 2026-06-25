import { defineConfig, type Config } from 'drizzle-kit';

const url = process.env.TURSO_DATABASE_URL ?? 'file:./local.db';
const authToken = process.env.TURSO_AUTH_TOKEN;

// Local dev uses a plain SQLite file (no driver/token needed). Hosted Turso
// (a libsql:// url + token) uses the `turso` driver, as in the spec.
const config: Config = authToken
  ? {
      schema: './db/schema.ts',
      out: './db/migrations',
      dialect: 'sqlite',
      driver: 'turso',
      dbCredentials: { url, authToken },
      verbose: true,
      strict: true,
    }
  : {
      schema: './db/schema.ts',
      out: './db/migrations',
      dialect: 'sqlite',
      dbCredentials: { url },
      verbose: true,
      strict: true,
    };

export default defineConfig(config);
