import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { errors } from '@/lib/api';

/** The signed-in Clerk userId, or throw 401. */
export async function requireUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw errors.unauthorized();
  return userId;
}

/**
 * Like requireUserId, but also guarantees a `users` row exists so foreign
 * keys hold. Call this before any write that references the user.
 */
export async function requireUser(): Promise<string> {
  const userId = await requireUserId();
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ?? `${userId}@users.tally.app`;
  await db
    .insert(users)
    .values({ id: userId, email })
    .onConflictDoNothing();
  return userId;
}
