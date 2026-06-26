import { execSync } from 'node:child_process';

/**
 * When running E2E against a local dev server (no PLAYWRIGHT_BASE_URL), push the
 * schema and seed a throwaway local file db so the flows have roster + history.
 * Against a Vercel preview, the deploy owns its own data and this is skipped.
 */
export default async function globalSetup() {
  if (process.env.PLAYWRIGHT_BASE_URL) return;

  const env = {
    ...process.env,
    TURSO_DATABASE_URL: 'file:./e2e-local.db',
    TURSO_AUTH_TOKEN: '',
    DEV_USER_ID: 'demo-user',
    SEED_USER_ID: 'demo-user',
  };
  try {
    execSync('node node_modules/drizzle-kit/bin.cjs push --force', {
      env,
      stdio: 'inherit',
    });
    execSync('node node_modules/tsx/dist/cli.mjs db/seed.ts', {
      env,
      stdio: 'inherit',
    });
  } catch (err) {
    console.warn('[e2e] local seed skipped:', err);
  }
}
