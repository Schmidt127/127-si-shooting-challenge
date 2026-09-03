import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FamilySwitcher } from "@/components/auth/family-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProgramPage } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { getAthleteAuthSecret, isAthleteAuthConfigured } from "@/lib/auth/config";
import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import { createOpaqueSelectionToken } from "@/lib/auth/selection-token";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Select athlete",
  description: "Choose which athlete dashboard to open for your family sign-in.",
  path: "/dashboard/select",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export default async function DashboardSelectPage() {
  if (!isAthleteAuthConfigured()) {
    redirect("/dashboard");
  }

  const session = await getAthleteSessionFromCookies();
  if (!session) {
    redirect("/dashboard/sign-in");
  }

  const secret = getAthleteAuthSecret();
  if (!secret) {
    redirect("/dashboard/sign-in");
  }

  const access = await loadAuthorizedEnrollmentForSession(session);

  if (access.enrollments.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <SignOutButton />
        </div>
        <EmptyState
          title="No active enrollment found"
          description="We could not find an active Shooting Challenge enrollment for your signed-in parent email. Request a new sign-in link after your registration is active."
        />
      </div>
    );
  }

  if (access.enrollments.length === 1) {
    redirect("/dashboard");
  }

  if (access.active && !access.needsSelection) {
    redirect("/dashboard");
  }

  const items = access.enrollments.map((item) => ({
    displayName: item.displayName,
    programLabel: item.programLabel,
    seasonLabel: item.seasonLabel,
    selectionToken: createOpaqueSelectionToken(
      {
        enrollmentId: item.enrollmentId,
        parentEmail: session.parentEmail,
      },
      secret,
    ),
    active: false,
  }));

  return (
    <ProgramPage
      eyebrow="Family dashboard"
      title="Choose an athlete"
      description="Open one child's private dashboard. You can switch athletes anytime without signing in again."
      heroVariant="light"
      ambientVariant="default"
      meta={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span role="status">Signed in · select a child to continue</span>
          <SignOutButton />
        </div>
      }
    >
      <div className="mx-auto max-w-lg" data-testid="dashboard-child-select">
        <FamilySwitcher items={items} variant="list" />
      </div>
    </ProgramPage>
  );
}
