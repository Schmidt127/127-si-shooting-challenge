import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="max-w-md rounded-2xl border border-white/12 bg-card/90 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="font-display mt-4 text-2xl">Page not found</h1>
        <p className="mt-3 text-sm text-muted">This route does not exist or has moved.</p>
        <Link href="/" className="btn-secondary mt-6">
          Back to home
        </Link>
      </div>
    </div>
  );
}
