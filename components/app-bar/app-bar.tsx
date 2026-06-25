'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { useCommandPalette } from '@/components/command-palette/command-palette';

export function AppBar() {
  const { open } = useCommandPalette();

  return (
    <header className="safe-top sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
      <div className="safe-x mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4">
        <Link
          href="/app"
          aria-label="Tally home"
          className="flex items-center gap-2 rounded-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Logo className="size-7" />
          <span className="hidden text-lg font-semibold tracking-tight text-text sm:inline">
            Tally
          </span>
        </Link>

        <button
          type="button"
          onClick={open}
          className="group flex h-10 flex-1 items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-sm text-text-hint transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Search bills and people"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-text-hint sm:block">
            ⌘K
          </kbd>
        </button>

        <ThemeToggle />
        <div className="grid size-9 place-items-center">
          <UserButton
            appearance={{ elements: { avatarBox: 'size-8' } }}
          />
        </div>
      </div>
    </header>
  );
}
