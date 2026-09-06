import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AthleteDashboardView } from "@/components/dashboard/athlete-dashboard-view";
import { CtaLink, ProgramPage } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { getAthleteAuthSecret, isAthleteAuthConfigured } from "@/lib/auth/config";
import { mintEnrollmentSelectionKey } from "@/lib/auth/selection-token";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import { getCurriculumHubUrl } from "@/lib/curriculum/handoff";
import { loadAuthenticatedAthleteDashboard } from "@/lib/data/athlete-dashboard";
import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";
import { DASHBOARD_PLACEHOLDER } from "@/lib/release/public-surface";
import { DASHBOARD_GENERIC_UNAVAILABLE } from "@/lib/security";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description: "Private family dashboard for enrolled Shooting Challenge athletes.",
  path: "/dashboard",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

type AthleteDashboardPageProps = {
  searchParams: Promise<{ enrollmentId?: string; slug?: string }>;
};

export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const { enrollmentId, slug } = await searchParams;

  // Legacy bookmarks with ?enrollmentId=rec… — strip to a clean private URL (IDs never authorize).
  if (enrollmentId?.trim() || slug?.trim()) {
    redirect("/dashboard");
  }

  if (isAthleteAuthConfigured()) {
    const session = await getAthleteSessionFromCookies();
    if (!session) {
      redirect("/dashboard/sign-in");
    }

    const secret = getAthleteAuthSecret();
    if (!secret) {
      redirect("/dashboard/sign-in");
    }

    try {
      const result = await loadAuthenticatedAthleteDashboard({ session });

      if (result.status === "needs_selection") {
        redirect("/dashboard/select");
      }

      if (result.status === "empty") {
        return (
          <EmptyState
            title="No active enrollment found"
            description="We could not find an active Shooting Challenge enrollment for your signed-in parent email."
          />
        );
      }

      const activeSelectionKey = mintEnrollmentSelectionKey(
        result.activeEnrollmentId,
        session.parentEmail,
        secret,
      );

      const familyOptions = result.familyEnrollments.map((item) => ({
        displayName: item.displayName,
        selectionKey: mintEnrollmentSelectionKey(
          item.enrollmentId,
          session.parentEmail,
          secret,
        ),
        programLabel: item.programLabel,
        seasonLabel: item.seasonLabel,
      }));

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "/shoot";
      const curriculumConfigured = Boolean(
        getCurriculumHubUrl() &&
          (process.env.CURRICULUM_HANDOFF_SECRET?.trim().length ?? 0) >= 32,
      );

      return (
        <div data-testid="athlete-dashboard-authenticated">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Private family dashboard · {result.data.programLabel} · {result.data.seasonLabel}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {curriculumConfigured ? (
                <form method="post" action={`${basePath}/api/curriculum/start`}>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    Open Homework
                  </button>
                </form>
              ) : null}
              <SignOutButton />
            </div>
          </div>
          <AthleteDashboardView
            data={result.data}
            activeSelectionKey={activeSelectionKey}
            familyEnrollments={familyOptions}
          />
        </div>
      );
    } catch (error) {
      if (error instanceof XpActivityLoadError) {
        return (
          <ErrorState title="XP activity unavailable" message={DASHBOARD_GENERIC_UNAVAILABLE} />
        );
      }
      throw error;
    }
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
          <CtaLink href="/dashboard/sign-in" variant="secondary">
            Parent sign-in
          </CtaLink>
          <CtaLink href="/" variant="secondary">
            Back to home
          </CtaLink>
        </div>
      </div>
    </ProgramPage>
  );
}
