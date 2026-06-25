import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Everything under /app and every /api route is protected, except the health
// check. The marketing landing (/), sign-in, and sign-up stay public.
const isProtected = createRouteMatcher(['/app(.*)', '/api/(.*)']);
const isPublic = createRouteMatcher([
  '/api/health',
  '/sign-in(.*)',
  '/sign-up(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req) && !isPublic(req)) {
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
