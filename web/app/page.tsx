/**
 * Homepage — private development landing page.
 * Proves the deployment pipeline before any Airtable-backed UI ships.
 */
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-10 text-center shadow-2xl">
        <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-accent-soft">
          127 Sports Intensity
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          127 Sports Intensity Shooting Challenge
        </h1>

        <p className="mt-4 text-lg text-muted">Private Development Site</p>

        <p className="mt-8 rounded-lg border border-border bg-background px-4 py-3 font-mono text-sm text-muted">
          Pipeline Test: Cursor → GitHub → Vercel → Airtable
        </p>

        <p className="mt-6 text-sm text-muted">
          Placeholder routes are scaffolded. Data fetching and public pages will ship in later
          phases.
        </p>

        <a
          href="/leaderboard"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent to-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:brightness-110"
        >
          View Live Leaderboard →
        </a>
      </div>
    </main>
  );
}
