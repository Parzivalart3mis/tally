import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

// Rendered per-request (not a cached static /404 asset), so a deploy-window
// miss can't be cached at the edge and replayed.
export const dynamic = 'force-dynamic';

export default function NotFound() {
  return (
    <div className="safe-top safe-bottom grid min-h-dvh place-items-center px-6 text-center">
      <div className="flex flex-col items-center gap-4">
        <Logo className="size-12" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Not found</h1>
          <p className="text-sm text-text-muted">
            That page doesn’t exist or has moved.
          </p>
        </div>
        <Button asChild>
          <Link href="/app">Go to Tally</Link>
        </Button>
      </div>
    </div>
  );
}
