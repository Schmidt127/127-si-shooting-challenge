import type { Metadata } from "next";
import Link from "next/link";

import { ADMIN_PLACEHOLDER } from "@/lib/release/public-surface";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin area — roadmap only until staff auth exists.
 * Must not fetch or render private participant diagnostics here.
 */
export default function AdminPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-widest text-accent-soft">Staff only</p>
      <h1 className="font-display mt-2 text-3xl text-foreground">{ADMIN_PLACEHOLDER.title}</h1>
      <p className="mt-4 text-muted">{ADMIN_PLACEHOLDER.description}</p>

      <section
        className="mt-10 rounded-2xl border border-border bg-card p-6"
        aria-labelledby="admin-roadmap-heading"
      >
        <h2 id="admin-roadmap-heading" className="font-display text-xl text-foreground">
          Read-only roadmap (post-auth)
        </h2>
        <p className="mt-2 text-sm text-muted">
          After staff authentication is wired, diagnostics will stay aggregate and server-side only.
          No write controls in the first slice.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground">
          <li>Enrollment processing readiness</li>
          <li>Submission / asset handoff readiness</li>
          <li>Homework completion and video feedback readiness</li>
          <li>XP event and weekly summary readiness</li>
          <li>Zoom attendance, level recalculation, Perfect Week state</li>
        </ul>
        <p className="mt-4 text-sm text-muted">
          Full auth and architecture notes live in the repo at{" "}
          <code className="rounded bg-brand-light-gray px-1.5 py-0.5 text-xs">
            web/docs/admin-roadmap.md
          </code>
          .
        </p>
      </section>

      <p className="mt-8 text-sm text-muted" role="status">
        Participant data exposed: no · Writes enabled: no
      </p>

      <Link href="/" className="btn-secondary mt-8 w-fit">
        ← Back to home
      </Link>
    </main>
  );
}
