import type { Metadata } from "next";

import { AthleteDashboardView } from "@/components/dashboard/athlete-dashboard-view";
import { ErrorState } from "@/components/ui";
import { loadAthleteDashboard } from "@/lib/data/athlete-dashboard";
import { XpActivityLoadError } from "@/lib/data/xp-activity-loader";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Athlete program home — level, XP, weekly shots, streak, Perfect Week, homework, and next action.",
};

export const revalidate = 60;

type AthleteDashboardPageProps = {
  searchParams: Promise<{ enrollmentId?: string; slug?: string }>;
};

export default async function AthleteDashboardPage({ searchParams }: AthleteDashboardPageProps) {
  const { enrollmentId, slug } = await searchParams;

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
          message={error.message}
        />
      );
    }
    throw error;
  }
}
