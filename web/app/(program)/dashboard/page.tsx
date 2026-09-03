import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AthleteDashboardView } from "@/components/dashboard/athlete-dashboard-view";
import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { isAthleteAuthConfigured } from "@/lib/auth/config";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import {
  loadAuthenticatedAthleteDashboard,
} from "@/lib/data/athlete-dashboard";
import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";
import { DASHBOARD_PLACEHOLDER } from "@/lib/release/public-surface";
import { DASHBOARD_GENERIC_UNAVAILABLE } from "@/lib/security";
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
 * Athlete dashboard — blocked until SC-112 is enabled in Vercel, then parent magic-link auth.
 * Query params such as enrollmentId are ignored or rejected to prevent live data exposure.
 */
export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const { enrollmentId, slug } = await searchParams;

  if (isAthleteAuthConfigured()) {
    const session = await getAthleteSessionFromCookies();
    if (!session) {
      redirect("/dashboard/sign-in");
    }

    try {
      const result = await loadAuthenticatedAthleteDashboard({
        session,
        urlEnrollmentId: enrollmentId?.trim() || undefined,
      });

      if (result.status === "forbidden") {
        return (
          <ErrorState
            title="Access denied"
            message="That dashboard link is not authorized for your family sign-in. Open the dashboard without changing the enrollment link, or request a new sign-in email."
          />
        );
      }

      if (result.status === "empty") {
        return (
          <EmptyState
            title="No active enrollment found"
            description="We could not find an active Shooting Challenge enrollment for your signed-in parent email."
          />
        );
      }

      return (
        <>
          <div className="mb-4 flex justify-end">
            <SignOutButton />
          </div>
          <AthleteDashboardView data={result.data} />
        </>
      );
    } catch (error) {
      if (error instanceof XpActivityLoadError) {
        return (
          <ErrorState
            title="XP activity unavailable"
            message={DASHBOARD_GENERIC_UNAVAILABLE}
          />
        );
      }
      throw error;
    }
  }

  if (enrollmentId?.trim() || slug?.trim()) {
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
