import { NextResponse } from 'next/server';

// Always run the function; never serve a cached (edge) response.
export const dynamic = 'force-dynamic';

// Public, unauthenticated liveness check.
export function GET() {
  return NextResponse.json({ ok: true, service: 'tally' });
}
