import type { Metadata } from "next";
import Link from "next/link";

import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Page not found",
  description: "This Shooting Challenge page does not exist or has moved.",
  includeCanonical: false,
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export default function NotFoundPage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-24 text-foreground outline-none"
    >
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[0_8px_24px_-12px_rgba(38,38,38,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">404</p>
        <h1 className="font-display mt-4 text-2xl">Page not found</h1>
        <p className="mt-3 text-sm text-muted">This route does not exist or has moved.</p>
        <Link href="/" className="btn-secondary mt-6">
          Back to home
        </Link>
      </div>
    </main>
  );
}
