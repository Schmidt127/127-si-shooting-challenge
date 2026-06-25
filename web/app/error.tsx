"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-accent/80 to-transparent" />
        <h1 className="mt-6 text-2xl font-bold">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
