import type { Metadata } from "next";

import { CtaLink, ProgramPage } from "@/components/site";
import { DASHBOARD_PLACEHOLDER } from "@/lib/release/public-surface";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description: DASHBOARD_PLACEHOLDER.description,
  path: "/dashboard",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

type AthleteDashboardPageProps = {
  searchParams: Promise<{ enrollmentId?: string; slug?: string }>;
};

/**
 * Athlete dashboard — blocked until SC-112 athlete authentication ships.
 * Query params such as enrollmentId are ignored to prevent live data exposure.
 */
export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const params = await searchParams;
  if (params.enrollmentId?.trim() || params.slug?.trim()) {
    console.warn(
      "[dashboard] Ignored query params on blocked athlete dashboard route (SC-112 pending).",
    );
  }

  return (
    <ProgramPage
      eyebrow="Athlete dashboard"
      title={DASHBOARD_PLACEHOLDER.title}
      description={DASHBOARD_PLACEHOLDER.description}
      heroVariant="light"
      ambientVariant="default"
      meta={
        <span role="status">
          Personal athlete data: not available yet · Athlete sign-in required (SC-112)
        </span>
      }
    >
      <div className="mx-auto flex max-w-xl flex-col items-start gap-4 text-sm text-muted">
        <p>
          The leaderboard, homework catalog, and published athlete profiles remain available while
          sign-in is being built.
        </p>
        <div className="flex flex-wrap gap-3">
          <CtaLink href="/leaderboard" variant="cta">
            Season leaderboard
          </CtaLink>
          <CtaLink href="/homework" variant="secondary">
            Homework catalog
          </CtaLink>
          <CtaLink href="/" variant="secondary">
            Back to home
          </CtaLink>
        </div>
      </div>
    </ProgramPage>
  );
}
