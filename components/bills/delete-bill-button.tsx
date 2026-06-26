'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiSend } from '@/lib/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export function DeleteBillButton({ billId }: { billId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await apiSend(`/api/bills/${billId}`, 'DELETE');
      toast.success('Bill deleted.');
      router.push('/app');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete.');
      setBusy(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Delete bill">
          <Trash2 className="size-4 text-text-muted" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this bill?</DialogTitle>
          <DialogDescription>
            This removes the bill and its breakdown. It cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="secondary" className="flex-1">
              Keep
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={busy}
            onClick={remove}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
