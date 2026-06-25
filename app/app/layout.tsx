import { CommandPaletteProvider } from '@/components/command-palette/command-palette';
import { AppBar } from '@/components/app-bar/app-bar';
import { BottomNav } from '@/components/app-bar/bottom-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-dvh flex-col">
        <AppBar />
        <main className="safe-x mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-5">
          {children}
        </main>
        <BottomNav />
      </div>
    </CommandPaletteProvider>
  );
}
