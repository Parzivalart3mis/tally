import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { errors } from '@/lib/api';

/**
 * Dev-only escape hatch: when DEV_USER_ID is set and we're NOT in production,
 * bypass Clerk and act as that user. Lets you run the seeded demo locally
 * without configuring Clerk. Has no effect in a production build.
 */
const devUserId =
  process.env.NODE_ENV !== 'production' ? process.env.DEV_USER_ID : undefined;

/** The signed-in Clerk userId, or throw 401. */
export async function requireUserId(): Promise<string> {
  if (devUserId) return devUserId;
  const { userId } = await auth();
  if (!userId) throw errors.unauthorized();
  return userId;
}

/**
 * Like requireUserId, but also guarantees a `users` row exists so foreign
 * keys hold. Call this before any write that references the user.
 */
export async function requireUser(): Promise<string> {
  if (devUserId) {
    await db
      .insert(users)
      .values({ id: devUserId, email: `${devUserId}@dev.local` })
      .onConflictDoNothing();
    return devUserId;
  }
  const { userId } = await auth();
  if (!userId) throw errors.unauthorized();
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? `${userId}@users.tally.app`;
  await db.insert(users).values({ id: userId, email }).onConflictDoNothing();
  return userId;
}
