import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

/**
 * Shared scaffold for routes that are planned but not yet implemented.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">Coming soon</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground">{title}</h1>
        <p className="mt-4 text-muted">{description}</p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-lg border border-border px-4 py-2 text-sm text-foreground transition hover:border-accent hover:text-accent"
        >
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
