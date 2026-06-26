'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Segment error boundary: turns any render/runtime error in the app into a
// visible, recoverable message instead of a silent blank screen.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[app error]', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-warning/15 text-warning">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text">Something went wrong</h2>
        <p className="text-sm text-text-muted">
          An unexpected error interrupted this screen. Your saved bills are safe.
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button
          variant="secondary"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}
