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
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-[0_8px_24px_-12px_rgba(38,38,38,0.18)]">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">Coming soon</p>
        <h1 className="font-display mt-2 text-2xl text-foreground">{title}</h1>
        <p className="mt-4 text-muted">{description}</p>
        <Link href="/" className="btn-secondary mt-8">
          ← Back to home
        </Link>
      </div>
    </main>
  );
}
