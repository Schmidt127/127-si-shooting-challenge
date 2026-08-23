import type { Metadata } from "next";

import { XpActivityTable } from "@/components/dashboard/xp-activity-table";
import { ProgramPage } from "@/components/site";
import { ErrorState } from "@/components/ui";
import {
  loadXpActivityForEnrollment,
  XpActivityLoadError,
} from "@/lib/data/xp-activity-loader";

export const metadata: Metadata = {
  title: "XP Activity Preview",
  description: "Live Airtable XP activity preview for one enrollment record.",
  robots: { index: false, follow: false },
};

export const revalidate = 0;

type XpActivityPreviewPageProps = {
  searchParams: Promise<{ enrollmentId?: string }>;
};

export default async function XpActivityPreviewPage({ searchParams }: XpActivityPreviewPageProps) {
  const { enrollmentId = "" } = await searchParams;
  const trimmed = enrollmentId.trim();

  if (!trimmed) {
    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description="Pass ?enrollmentId=rec… to load live XP Events for one enrollment."
      >
        <ErrorState
          title="Missing enrollmentId"
          message="Add ?enrollmentId=recXXXXXXXXXXXXXX to the URL."
        />
      </ProgramPage>
    );
  }

  try {
    const result = await loadXpActivityForEnrollment(trimmed, { maxRows: 100 });

    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description={`Enrollment ${trimmed} · strategy ${result.strategy} · ${result.rows.length} row(s)`}
      >
        <XpActivityTable rows={result.rows} warning={result.warning} />
      </ProgramPage>
    );
  } catch (error) {
    const message =
      error instanceof XpActivityLoadError
        ? error.message
        : "Something went wrong loading XP activity for this enrollment.";

    return (
      <ProgramPage
        eyebrow="Preview"
        title="XP activity preview"
        description={`Enrollment ${trimmed}`}
      >
        <ErrorState title="XP activity unavailable" message={message} />
      </ProgramPage>
    );
  }
}
