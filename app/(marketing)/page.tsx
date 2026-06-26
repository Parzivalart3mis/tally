import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import {
  Receipt,
  Users,
  Calculator,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';

const FEATURES = [
  {
    icon: Receipt,
    title: 'Snap the receipt',
    body: 'Photograph the bill and have its line items and totals read out for you.',
  },
  {
    icon: Users,
    title: 'Tap who had what',
    body: 'Assign each item to the people who shared it, from a roster you keep.',
  },
  {
    icon: Calculator,
    title: 'Choose the math',
    body: 'Exact in-app code by default, or run it through Claude or Groq.',
  },
  {
    icon: ShieldCheck,
    title: 'Proven to add up',
    body: 'A sum-check confirms every share reconciles back to the grand total.',
  },
];

export default async function MarketingPage() {
  // Already signed in? Go straight to the app instead of the landing page —
  // so launching the installed PWA opens Tally directly, not this page.
  const { userId } = await auth();
  if (userId) redirect('/app');

  return (
    <div className="min-h-dvh">
      <header className="safe-top">
        <div className="safe-x mx-auto flex h-16 w-full max-w-4xl items-center justify-between">
          <span className="flex items-center gap-2">
            <Logo className="size-8" />
            <span className="text-lg font-semibold tracking-tight">Tally</span>
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/sign-in">Sign in</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="safe-x mx-auto w-full max-w-4xl">
        <section className="flex flex-col items-center gap-6 py-16 text-center sm:py-24">
          <Logo className="size-20" />
          <h1 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-[2.75rem] sm:leading-tight">
            Split a bill from a receipt, exactly.
          </h1>
          <p className="max-w-xl text-balance text-lg text-text-muted">
            A receipt photo in, an exact who-owes-what out — saved with the
            people you split with and the picture of the bill.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/app">
                Open Tally
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-up">Create an account</Link>
            </Button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 pb-16 sm:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-card border border-border bg-surface p-5 shadow-card"
              >
                <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                  <Icon className="size-5" />
                </span>
                <h2 className="mt-3 text-lg font-semibold">{f.title}</h2>
                <p className="mt-1 text-sm text-text-muted">{f.body}</p>
              </div>
            );
          })}
        </section>

        <section className="mb-20 rounded-card border border-border bg-surface-2 p-6 text-center">
          <p className="text-sm text-text-muted">
            Add Tally to your iPhone home screen from Safari’s share menu — it
            launches full-screen, like a real app.
          </p>
        </section>
      </main>
    </div>
  );
}
