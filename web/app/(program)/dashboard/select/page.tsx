import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { FamilyEnrollmentSwitcher } from "@/components/auth/family-enrollment-switcher";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ProgramPage } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { getAthleteAuthSecret, isAthleteAuthConfigured } from "@/lib/auth/config";
import { loadAuthorizedEnrollmentForSession } from "@/lib/auth/enrollment-access";
import { mintEnrollmentSelectionKey } from "@/lib/auth/selection-token";
import { getAthleteSessionFromCookies } from "@/lib/auth/server-session";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Choose athlete",
  description: "Select which enrolled athlete dashboard to open for this family sign-in.",
  path: "/dashboard/select",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export const dynamic = "force-dynamic";

export default async function DashboardChildSelectPage() {
  if (!isAthleteAuthConfigured()) {
    redirect("/dashboard/sign-in");
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
      <ProgramPage
        eyebrow="Family dashboard"
        title="Choose athlete"
        description="Select which athlete dashboard to open."
        heroVariant="light"
        ambientVariant="default"
      >
        <div className="mb-4 flex justify-end">
          <SignOutButton />
        </div>
        <EmptyState
          title="No active enrollment found"
          description="We could not find an active Shooting Challenge enrollment for your signed-in parent email."
        />
      </ProgramPage>
    );
  }

  if (access.enrollments.length === 1) {
    redirect("/dashboard");
  }

  if (access.active && !access.needsSelection) {
    redirect("/dashboard");
  }

  const options = access.enrollments.map((item) => ({
    displayName: item.displayName,
    selectionKey: mintEnrollmentSelectionKey(item.enrollmentId, session.parentEmail, secret),
    programLabel: item.programLabel,
    seasonLabel: item.seasonLabel,
  }));

  return (
    <ProgramPage
      eyebrow="Family dashboard"
      title="Choose athlete"
      description="Your family sign-in covers more than one active enrollment. Open the dashboard for one athlete at a time."
      heroVariant="light"
      ambientVariant="default"
      meta={<span role="status">Private · no Airtable IDs in this URL</span>}
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Signed in as a parent · select a child to continue</p>
        <SignOutButton />
      </div>
      <div className="mx-auto max-w-lg">
        <FamilyEnrollmentSwitcher enrollments={options} variant="select" />
      </div>
    </ProgramPage>
  );
}
