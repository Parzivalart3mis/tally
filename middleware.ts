import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Only /app PAGES are enforced here (so a signed-out visitor is redirected to
// sign-in). API routes are intentionally NOT protected by the middleware:
// `auth.protect()` returns an opaque 404 (renders /_not-found) when a session
// token is momentarily stale, which looked like a routing failure. Instead,
// every /api handler calls requireUser()/requireUserId() itself and returns a
// clean, retryable 401. clerkMiddleware still RUNS on /api (the matcher below)
// so auth()/currentUser() work inside those handlers — we just don't enforce.
const isProtectedPage = createRouteMatcher(['/app(.*)']);

// Dev-only: with DEV_USER_ID set (non-production), skip Clerk protection so the
// seeded demo is viewable without configuring Clerk. No effect in production.
const devBypass =
  process.env.NODE_ENV !== 'production' && !!process.env.DEV_USER_ID;

export default clerkMiddleware(async (auth, req) => {
  if (devBypass) return;
  if (isProtectedPage(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on app pages and API, but skip Next internals and static assets
    // (manifest, service worker, icons) so the PWA shell is publicly fetchable.
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|.*\\.(?:png|jpg|jpeg|svg|ico|webmanifest|js|css|woff2?)$).*)',
    '/(api|trpc)(.*)',
  ],
};
