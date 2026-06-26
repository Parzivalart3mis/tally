<div align="center">

<img src="public/icons/icon.svg" width="88" height="88" alt="Tally" />

# Tally

**Split a bill from a receipt, exactly.**

A personal bill-splitting PWA: snap a receipt, tap who had what, and watch each
person's share land with a sum-check that proves it adds up.

</div>

---

Photograph the bill, review the read-out items, assign each line to the people
who shared it, and compute the split with **exact in-app code** (default),
**Claude**, or **Groq** — all returning the same result shape with a sum-check.
Every bill is saved with its receipt image and a frozen snapshot of who was on
it, so removing someone from your roster never disturbs past history.

```bash
pnpm install
cp .env.example .env.local
pnpm db:push && pnpm db:seed
pnpm dev            # → http://localhost:3000  (DEV_USER_ID bypasses Clerk locally)
```

📖 **Full documentation — setup, env vars, architecture, the splitting
algorithm, and iPhone install — lives in [`docs/README.md`](docs/README.md).**

Built with Next.js 15 · React 19 · Drizzle + Turso · Vercel Blob · Clerk ·
Framer Motion · Tailwind.
