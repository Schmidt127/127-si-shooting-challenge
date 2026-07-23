import type { Metadata } from "next";

import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
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
    <ProgramPage
      eyebrow="Staff only"
      title={ADMIN_PLACEHOLDER.title}
      description={ADMIN_PLACEHOLDER.description}
      heroVariant="light"
      ambientVariant="default"
      meta={
        <span role="status">
          Participant data exposed: no · Writes enabled: no
        </span>
      }
    >
      <div className="mx-auto max-w-3xl">
        <SectionMarker
          label="Roadmap"
          title="Read-only roadmap (post-auth)"
        />
        <section
          className={catalogPanelClass({ tint: "neutral" })}
          aria-labelledby="admin-roadmap-heading"
        >
          <h2 id="admin-roadmap-heading" className="sr-only">
            Read-only roadmap (post-auth)
          </h2>
          <p className="text-sm text-muted">
            After staff authentication is wired, diagnostics will stay aggregate and server-side
            only. No write controls in the first slice.
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-foreground">
            <li>Athlete / enrollment lookup (Airtable deep links only at first)</li>
            <li>Test scenario access + failed automation visibility</li>
            <li>Email / upload retry status (read-only; no write buttons)</li>
            <li>XP and achievement audit aggregates</li>
            <li>Weekly summary rebuild readiness + config health</li>
            <li>Open Mike decision flags (auth, Softr, indexing, quiz path)</li>
          </ul>
          <p className="mt-4 text-sm text-muted">
            Overnight roadmap:{" "}
            <code className="rounded bg-brand-light-gray px-1.5 py-0.5 text-xs">
              docs/overnight/web-integration/ADMIN-ROADMAP.md
            </code>
            . In-app notes:{" "}
            <code className="rounded bg-brand-light-gray px-1.5 py-0.5 text-xs">
              web/docs/admin-roadmap.md
            </code>
            .
          </p>
        </section>

        <CtaLink href="/" variant="secondary" className="mt-8">
          ← Back to home
        </CtaLink>
      </div>
    </ProgramPage>
  );
}
