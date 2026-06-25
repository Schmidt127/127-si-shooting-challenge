import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="mt-4 text-2xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm text-muted">This route does not exist or has moved.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
