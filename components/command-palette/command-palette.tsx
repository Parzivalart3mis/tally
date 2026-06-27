'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import {
  Home,
  Plus,
  Receipt,
  Search,
  SunMoon,
  Users,
  BarChart3,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { apiGet } from '@/lib/client';
import { formatCents } from '@/lib/money';
import { formatDay } from '@/lib/format';

interface SearchBill {
  id: string;
  title: string | null;
  grandTotalCents: number;
  createdAt: string;
}
interface SearchPerson {
  id: string;
  name: string;
}
interface SearchResponse {
  bills: SearchBill[];
  people: SearchPerson[];
}

const Ctx = createContext<{ open: () => void } | null>(null);

export function useCommandPalette() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCommandPalette must be inside provider');
  return ctx;
}

export function CommandPaletteProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse>({
    bills: [],
    people: [],
  });

  const openPalette = useCallback(() => setOpen(true), []);

  // ⌘K / Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults({ bills: [], people: [] });
      return;
    }
    const id = setTimeout(() => {
      apiGet<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`)
        .then(setResults)
        .catch(() => setResults({ bills: [], people: [] }));
    }, 180);
    return () => clearTimeout(id);
  }, [query, open]);

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  return (
    <Ctx.Provider value={{ open: openPalette }}>
      {children}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-label="Search Tally"
            className="safe-top fixed inset-x-0 top-0 z-50 mx-auto mt-[8vh] w-[92%] max-w-xl overflow-hidden rounded-card border border-border bg-surface shadow-lift data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2"
          >
            <DialogPrimitive.Title className="sr-only">
              Search bills and people
            </DialogPrimitive.Title>
            <Command shouldFilter={false} className="flex flex-col">
              <div className="flex items-center gap-2 border-b border-border px-3">
                <Search className="size-4 shrink-0 text-text-hint" />
                <Command.Input
                  autoFocus
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search bills and people…"
                  className="h-12 flex-1 bg-transparent text-base text-text outline-none placeholder:text-text-hint"
                />
                <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-text-hint sm:block">
                  ESC
                </kbd>
              </div>
              <Command.List className="max-h-[55vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-text-muted">
                  {query.trim() ? 'No matches.' : 'Type to search.'}
                </Command.Empty>

                <Command.Group
                  heading="Go to"
                  className="px-1 pb-1 text-xs text-text-hint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                >
                  <PaletteItem onSelect={() => go('/app')} icon={<Home className="size-4" />}>
                    Home
                  </PaletteItem>
                  <PaletteItem onSelect={() => go('/app/new')} icon={<Plus className="size-4" />}>
                    New bill
                  </PaletteItem>
                  <PaletteItem onSelect={() => go('/app/insights')} icon={<BarChart3 className="size-4" />}>
                    Insights
                  </PaletteItem>
                  <PaletteItem onSelect={() => go('/app/people')} icon={<Users className="size-4" />}>
                    People
                  </PaletteItem>
                  <PaletteItem
                    onSelect={() =>
                      setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
                    }
                    icon={<SunMoon className="size-4" />}
                  >
                    Toggle theme
                  </PaletteItem>
                </Command.Group>

                {results.bills.length > 0 && (
                  <Command.Group
                    heading="Bills"
                    className="px-1 pb-1 text-xs text-text-hint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {results.bills.map((b) => (
                      <PaletteItem
                        key={b.id}
                        onSelect={() => go(`/app/bills/${b.id}`)}
                        icon={<Receipt className="size-4" />}
                      >
                        <span className="flex-1 truncate">
                          {b.title ?? 'Untitled bill'}
                        </span>
                        <span className="text-xs text-text-muted tabular">
                          {formatCents(b.grandTotalCents)} · {formatDay(b.createdAt)}
                        </span>
                      </PaletteItem>
                    ))}
                  </Command.Group>
                )}

                {results.people.length > 0 && (
                  <Command.Group
                    heading="People"
                    className="px-1 pb-1 text-xs text-text-hint [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {results.people.map((p) => (
                      <PaletteItem
                        key={p.id}
                        onSelect={() => go('/app/people')}
                        icon={<Users className="size-4" />}
                      >
                        {p.name}
                      </PaletteItem>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </Ctx.Provider>
  );
}

function PaletteItem({
  children,
  onSelect,
  icon,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  icon: React.ReactNode;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-2 text-sm text-text data-[selected=true]:bg-surface-2"
    >
      <span className="text-text-muted">{icon}</span>
      {children}
    </Command.Item>
  );
}
