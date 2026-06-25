import { NextResponse } from 'next/server';

// Public, unauthenticated liveness check.
export function GET() {
  return NextResponse.json({ ok: true, service: 'tally' });
}
