'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Plus, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/app', label: 'Home', icon: Home, exact: true },
  { href: '/app/new', label: 'New bill', icon: Plus, exact: false },
  { href: '/app/insights', label: 'Insights', icon: BarChart3, exact: false },
  { href: '/app/people', label: 'People', icon: Users, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  // The split flow pins its own action bar; hide the global nav there.
  if (pathname.startsWith('/app/new')) return null;

  return (
    <nav
      aria-label="Primary"
      className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/90 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-3xl items-stretch justify-around px-2">
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-0.5 px-2 py-2.5 text-[11px] font-medium transition-colors',
                active ? 'text-accent' : 'text-text-muted hover:text-text',
              )}
            >
              <span
                className={cn(
                  'grid place-items-center rounded-full px-3 py-1 transition-colors',
                  active && 'bg-accent-soft',
                )}
              >
                <Icon className="size-5" />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
