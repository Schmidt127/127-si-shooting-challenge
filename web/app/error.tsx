"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="max-w-md rounded-2xl border border-white/12 bg-card/90 p-8 text-center">
        <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" />
        <h1 className="font-display mt-6 text-2xl">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
