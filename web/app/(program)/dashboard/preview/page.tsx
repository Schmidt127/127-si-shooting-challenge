import type { Metadata } from "next";
import { headers } from "next/headers";

import { XpActivityTable } from "@/components/dashboard/xp-activity-table";
import { ProgramPage } from "@/components/site";
import { ErrorState } from "@/components/ui";
import {
  loadXpActivityForEnrollment,
  XpActivityLoadError,
} from "@/lib/data/xp-activity-loader";
import { buildPageMetadata, PRIVATE_ROBOTS_NOINDEX } from "@/lib/seo/metadata";
import {
  buildSiteAccessRequest,
  canAccessDashboardPreview,
  DASHBOARD_PREVIEW_BLOCKED,
  DASHBOARD_PREVIEW_MISSING_ENROLLMENT,
  DASHBOARD_PREVIEW_MISSING_ENROLLMENT_DEV,
  isDashboardPreviewDevEnvironment,
  xpActivityPublicErrorMessage,
} from "@/lib/security";

export const metadata: Metadata = buildPageMetadata({
  title: "XP Activity Preview",
  description: "Staff-only XP activity preview for engineering and support.",
  path: "/dashboard/preview",
  robots: PRIVATE_ROBOTS_NOINDEX,
});

export const revalidate = 0;

type XpActivityPreviewPageProps = {
  searchParams: Promise<{ enrollmentId?: string; site_access_token?: string }>;
};

export default async function XpActivityPreviewPage({ searchParams }: XpActivityPreviewPageProps) {
  const { enrollmentId = "", site_access_token: queryAccessToken = "" } = await searchParams;
  const headerStore = await headers();
  const accessRequest = buildSiteAccessRequest({
    authorizationHeader: headerStore.get("authorization"),
    cookieHeader: headerStore.get("cookie"),
    queryToken: queryAccessToken.trim() || null,
    pathname: "/dashboard/preview",
  });

  if (!canAccessDashboardPreview(accessRequest)) {
    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description="Staff-only preview"
      >
        <ErrorState title="Preview unavailable" message={DASHBOARD_PREVIEW_BLOCKED} />
      </ProgramPage>
    );
  }

  const trimmed = enrollmentId.trim();
  if (!trimmed) {
    const missingMessage = isDashboardPreviewDevEnvironment()
      ? DASHBOARD_PREVIEW_MISSING_ENROLLMENT_DEV
      : DASHBOARD_PREVIEW_MISSING_ENROLLMENT;

    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description="Staff-only preview"
      >
        <ErrorState title="Preview not ready" message={missingMessage} />
      </ProgramPage>
    );
  }

  try {
    const result = await loadXpActivityForEnrollment(trimmed, { maxRows: 100 });

    console.info("[dashboard/preview] loaded XP preview", {
      rowCount: result.rows.length,
      strategy: result.strategy,
      reconciliationCount: result.reconciliation.length,
      missingXpSubmissionCount: result.missingXpSubmissionIds.length,
    });

    const staffWarningParts: string[] = [];
    if (result.warning) staffWarningParts.push(result.warning);
    if (result.missingXpSubmissionIds.length > 0) {
      staffWarningParts.push(
        `${result.missingXpSubmissionIds.length} counted submission(s) may be missing XP Events.`,
      );
    }

    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description="Staff-only enrollment XP activity (do not share this URL)."
      >
        <XpActivityTable rows={result.rows} warning={staffWarningParts.join(" ") || undefined} />
      </ProgramPage>
    );
  } catch (error) {
    if (!(error instanceof XpActivityLoadError)) {
      console.error("[dashboard/preview] unexpected load failure", error);
    }

    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description="Staff-only preview"
      >
        <ErrorState
          title="XP activity unavailable"
          message={xpActivityPublicErrorMessage(error, "dashboard-preview")}
        />
      </ProgramPage>
    );
  }
}
