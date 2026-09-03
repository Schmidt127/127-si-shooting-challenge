import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { AthleteDashboardView } from "@/components/dashboard/athlete-dashboard-view";
import { ErrorState, EmptyState } from "@/components/ui";
import { isAthleteAuthConfigured } from "@/lib/auth/config";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import {
  loadAthleteDashboard,
  loadAuthenticatedAthleteDashboard,
} from "@/lib/data/athlete-dashboard";
import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Dashboard",
  description:
    "Athlete program home — level, XP, weekly shots, streak, Perfect Week, homework, and next action.",
  path: "/dashboard",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export const revalidate = 60;

type AthleteDashboardPageProps = {
  searchParams: Promise<{ enrollmentId?: string; slug?: string }>;
};

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
          <ErrorState title="XP activity unavailable" message="XP activity is temporarily unavailable. Please try again later." />
        );
      }
      throw error;
    }
  }

  try {
    const data = await loadAthleteDashboard({
      enrollmentId: enrollmentId?.trim() || undefined,
      slug: slug?.trim() || undefined,
    });
    return <AthleteDashboardView data={data} />;
  } catch (error) {
    if (error instanceof XpActivityLoadError) {
      return (
        <ErrorState
          title="XP activity unavailable"
          message="XP activity is temporarily unavailable. Please try again later."
        />
      );
    }
    throw error;
  }
}
