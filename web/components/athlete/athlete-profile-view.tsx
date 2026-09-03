import Link from "next/link";

import { AchievementCollection } from "@/components/athlete/achievement-collection";
import { HomeworkAssignments } from "@/components/athlete/homework-assignments";
import { PerfectWeekPanel } from "@/components/athlete/perfect-week-panel";
import { PerformanceSnapshot } from "@/components/athlete/performance-snapshot";
import { ProfileAtAGlance } from "@/components/athlete/profile-at-a-glance";
import { ProfileFreshnessNotice } from "@/components/athlete/profile-freshness-notice";
import { ProfileHero } from "@/components/athlete/profile-hero";
import { ProgressionPanel } from "@/components/athlete/progression-panel";
import { PublicAwardsSection } from "@/components/athlete/public-awards-section";
import { RecentActivityLog } from "@/components/athlete/recent-activity-log";
import { ShootingStatLine } from "@/components/athlete/shooting-stat-line";
import { StreakSection } from "@/components/athlete/streak-section";
import { WeeklyPerformance } from "@/components/athlete/weekly-performance";
import { AmbientPage } from "@/components/catalog/ambient-page";
import { SiteContainer } from "@/components/site/site-container";
import { EmptyState, ErrorState } from "@/components/ui";
import type { PublicAthleteProfile } from "@/types/public-athlete-profile";

type AthleteProfileViewProps = {
  data: PublicAthleteProfile;
};

export function AthleteProfileView({ data }: AthleteProfileViewProps) {
  const streakAchievements = data.achievements.filter((item) => item.group === "Streaks");

  return (
    <AmbientPage variant="leaderboard">
      <ProfileHero identity={data.identity} />
      <SiteContainer className="space-y-12 py-8 sm:space-y-14 sm:py-12">
        <ProfileFreshnessNotice mayBeStale={data.mayBeStale} fetchedAt={data.fetchedAt} />
        <ProfileAtAGlance data={data} />
        <PerformanceSnapshot performance={data.performance} />
        <ShootingStatLine shooting={data.shooting} />
        <ProgressionPanel progression={data.progression} />
        <HomeworkAssignments
          assignments={data.homeworkAssignments}
          loadUnavailable={data.mayBeStale}
        />
        <StreakSection streaks={data.streaks} streakAchievements={streakAchievements} />
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-10">
          <RecentActivityLog
            slug={data.identity.slug}
            items={data.recentActivity}
            totalCount={data.activityLedgerTotal}
            hasMore={data.activityLedgerHasMore}
            nextCursor={data.activityLedgerNextCursor}
            notice={data.activityLedgerNotice}
          />
          <PerfectWeekPanel weeks={data.weekly} />
        </div>
        <WeeklyPerformance weeks={data.weekly} />
        <PublicAwardsSection awards={data.awards} />
        <AchievementCollection achievements={data.achievements} />
        <p className="text-center text-xs text-muted">
          Public profile · personal contact details are never shown
        </p>
      </SiteContainer>
    </AmbientPage>
  );
}

export function AthleteProfileEmptyState({ slug }: { slug: string }) {
  return (
    <AmbientPage variant="default">
      <SiteContainer className="py-16">
        <EmptyState
          title="Athlete profile not found"
          description={`No public profile is available for “${slug}”. Public profiles appear only when a family has chosen to share an athlete page.`}
          titleAs="h1"
          action={
            <Link
              href="/leaderboard"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              View standings
            </Link>
          }
        />
      </SiteContainer>
    </AmbientPage>
  );
}

export function AthleteProfileErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <AmbientPage variant="default">
      <SiteContainer className="py-16">
        <ErrorState
          title="Profile unavailable"
          message={message ?? "Something went wrong loading this profile. Try again shortly."}
          action={
            onRetry
              ? (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
                  >
                    Try again
                  </button>
                )
              : undefined
          }
        />
      </SiteContainer>
    </AmbientPage>
  );
}
