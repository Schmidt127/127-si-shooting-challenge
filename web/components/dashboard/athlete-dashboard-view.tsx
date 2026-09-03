import Link from "next/link";

import {
  FamilySwitcher,
  type FamilySwitcherItem,
} from "@/components/auth/family-switcher";
import { DashboardHomeworkSection } from "@/components/dashboard/dashboard-homework-section";
import { DashboardSectionNav } from "@/components/dashboard/dashboard-section-nav";
import { DashboardXpSection } from "@/components/dashboard/dashboard-xp-section";
import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import {
  IconBolt,
  IconChevronRight,
  IconMedal,
  IconTarget,
  IconTrophy,
} from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import {
  InteractiveCard,
  LevelIndicator,
  ProgressMeter,
  StatTile,
  StatusBadge,
  scCardInset,
} from "@/components/ui";
import { weeklyShotPercent, type AthleteDashboardModel } from "@/lib/data/athlete-dashboard";
import { formatGrade, formatShots, formatXp } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { DashboardVideoFeedbackItem } from "@/types/private-athlete-dashboard";

type AthleteDashboardViewProps = {
  data: AthleteDashboardModel;
  familyEnrollments?: FamilySwitcherItem[];
};

function videoStatusLabel(status: DashboardVideoFeedbackItem["status"]): string {
  switch (status) {
    case "feedback_available":
      return "Feedback ready";
    case "reviewed":
      return "Reviewed";
    case "submitted":
      return "Submitted";
    default:
      return "Pending";
  }
}

function videoStatusTone(status: DashboardVideoFeedbackItem["status"]) {
  switch (status) {
    case "feedback_available":
      return "success" as const;
    case "reviewed":
      return "blue" as const;
    case "submitted":
      return "warn" as const;
    default:
      return "neutral" as const;
  }
}

export function AthleteDashboardView({
  data,
  familyEnrollments = [],
}: AthleteDashboardViewProps) {
  const weeklyPct = weeklyShotPercent(data.weekly.shots, data.weekly.goal);
  const goalPct = data.seasonOverview.goalProgressPercent ?? 0;
  const unlockedCount = data.achievements.filter((item) => item.unlocked).length;
  const isLive = data.source === "airtable";

  return (
    <ProgramPage
      eyebrow="Private family dashboard"
      title={data.athlete.displayName}
      description={`${data.programLabel} · ${data.seasonLabel} · ${formatGrade(data.athlete.grade)}`}
      heroVariant="contrast"
      ambientVariant="default"
      actions={
        <>
          <CtaLink href="/leaderboard" variant="cta">
            Season leaderboard
          </CtaLink>
          <CtaLink href={`/athletes/${data.athlete.slug}`} variant="contrast">
            Public profile
          </CtaLink>
        </>
      }
      meta={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatusBadge tone="success">Signed in · family view</StatusBadge>
          <span>Lifetime XP {formatXp(data.xp.total)}</span>
          {data.source === "mock" ? (
            <StatusBadge tone="warn">Sample preview — sign-in disabled</StatusBadge>
          ) : null}
        </div>
      }
    >
      {familyEnrollments.length > 1 ? (
        <div
          className={cn(catalogPanelClass({ tint: "blue" }), "mb-6")}
          data-testid="dashboard-family-switcher"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-blue">
            Family athletes
          </p>
          <FamilySwitcher items={familyEnrollments} variant="chips" />
          <p className="mt-2">
            <CtaLink href="/dashboard/select" variant="secondary">
              Choose athlete
            </CtaLink>
          </p>
        </div>
      ) : null}

      <DashboardSectionNav />

      <section
        id="dashboard-overview"
        className="scroll-mt-24 grid gap-6 lg:grid-cols-[1.4fr_1fr]"
        aria-label="Season overview"
      >
        <div className={catalogPanelClass({ tint: "neutral" })}>
          <div className="flex flex-wrap items-center gap-4">
            <AthleteAvatar
              name={data.athlete.displayName}
              headshotUrl={data.athlete.avatarUrl}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                {data.athlete.school}
              </p>
              <h2 className="font-display mt-1 truncate text-2xl text-foreground">
                {data.athlete.displayName}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {data.athlete.level} · {formatGrade(data.athlete.grade)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <LevelIndicator
              level={data.athlete.level}
              totalXp={data.xp.total}
              xpIntoLevel={data.xp.xpIntoLevel}
              xpForNextLevel={data.xp.xpForNextLevel}
              nextLevelLabel={data.xp.nextLevelLabel}
            />
          </div>

          {data.seasonOverview.goalTargetShots != null ? (
            <div className="mt-6">
              <ProgressMeter
                label="Season shot goal"
                valueLabel={`${formatShots(data.seasonOverview.totalShots)} of ${formatShots(data.seasonOverview.goalTargetShots)}`}
                percent={goalPct}
                tone="orange"
              />
            </div>
          ) : null}

          {data.seasonOverview.recentActivitySummary ? (
            <p className="mt-4 text-sm text-muted">{data.seasonOverview.recentActivitySummary}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <StatTile
            label="Season shots"
            value={formatShots(data.seasonOverview.totalShots)}
            icon={IconTarget}
            tint="blue"
          />
          <StatTile
            label={`${data.weekly.weekLabel} shots`}
            value={`${formatShots(data.weekly.shots)} / ${formatShots(data.weekly.goal)}`}
            icon={IconTarget}
            tint="blue"
            hint={`${weeklyPct}% of weekly goal`}
          />
          <StatTile
            label="Current streak"
            value={`${data.seasonOverview.currentStreak} days`}
            icon={IconBolt}
            tint="amber"
            hint={`Longest ${data.seasonOverview.longestStreak} days`}
          />
          <StatTile
            label="Perfect Weeks"
            value={String(data.perfectWeek.seasonCount)}
            icon={IconTrophy}
            tint="orange"
            hint={
              data.perfectWeek.earnedThisWeek ? "Earned this week" : "In progress this week"
            }
          />
          <StatTile
            label="Achievements"
            value={`${unlockedCount} unlocked`}
            icon={IconMedal}
            tint="muted"
          />
        </div>
      </section>

      <section className="mt-10" aria-label="Weekly progress and next action">
        <SectionMarker label="This week" title="Progress & next step" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className={catalogPanelClass({ tint: "blue" })}>
            <ProgressMeter
              label={`${data.weekly.weekLabel} target`}
              valueLabel={`${formatShots(data.weekly.shots)} of ${formatShots(data.weekly.goal)}`}
              percent={weeklyPct}
              tone="blue"
            />
            <p className="mt-4 text-sm text-muted">
              {data.perfectWeek.earnedThisWeek
                ? "Perfect Week locked in — keep the streak alive."
                : `Need ${formatShots(Math.max(0, data.weekly.goal - data.weekly.shots))} more counted shots for Perfect Week eligibility.`}
            </p>
          </div>

          <Link href={data.nextAction.href} className="block">
            <InteractiveCard featured="accent" className="h-full p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                Next action
              </p>
              <h3 className="font-display mt-2 text-xl text-foreground">{data.nextAction.label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{data.nextAction.description}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
                Go <IconChevronRight size={16} />
              </span>
            </InteractiveCard>
          </Link>
        </div>
      </section>

      <section
        id="dashboard-enrollment"
        className="scroll-mt-24 mt-10"
        aria-labelledby="dashboard-enrollment-heading"
      >
        <SectionMarker label="Enrollment" title="Family details" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <EnrollmentCard label="Athlete" value={data.enrollment.displayName} />
          <EnrollmentCard label="School" value={data.enrollment.school || "—"} />
          <EnrollmentCard label="Grade" value={formatGrade(data.enrollment.grade)} />
          <EnrollmentCard label="Grade band" value={data.enrollment.gradeBand ?? "—"} />
          <EnrollmentCard label="Program" value={data.enrollment.programLabel} />
          <EnrollmentCard label="Season" value={data.enrollment.seasonLabel} />
          <EnrollmentCard label="Status" value={data.enrollment.enrollmentStatus} />
          {data.enrollment.registrationSource ? (
            <EnrollmentCard label="Registration" value={data.enrollment.registrationSource} />
          ) : null}
          {data.enrollment.levelStatus ? (
            <EnrollmentCard label="Level status" value={data.enrollment.levelStatus} />
          ) : null}
          {data.enrollment.progressionStatus ? (
            <EnrollmentCard label="Progression" value={data.enrollment.progressionStatus} />
          ) : null}
        </div>
      </section>

      <div className="mt-10">
        <DashboardHomeworkSection items={data.homework} />
      </div>

      <section
        id="dashboard-video"
        className="scroll-mt-24 mt-10"
        aria-labelledby="dashboard-video-heading"
      >
        <SectionMarker label="Video feedback" title="Coach review" />
        {data.videoFeedback.length === 0 ? (
          <p className={cn(catalogPanelClass({ tint: "neutral" }), "text-sm text-muted")} role="status">
            No video submissions with feedback yet. Upload through your weekly video assignment workflow.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.videoFeedback.map((item) => (
              <article key={item.key} className={catalogPanelClass({ tint: "neutral" })} data-testid="dashboard-video-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                      {item.weekLabel}
                      {item.activityDate ? ` · ${item.activityDate}` : ""}
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">{item.title}</h3>
                  </div>
                  <StatusBadge tone={videoStatusTone(item.status)}>
                    {videoStatusLabel(item.status)}
                  </StatusBadge>
                </div>
                {item.coachFeedback ? (
                  <p className={cn(scCardInset(), "mt-3 text-sm leading-relaxed text-muted")}>
                    {item.coachFeedback}
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-muted">Coach feedback will appear after review.</p>
                )}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {item.xpAwarded != null ? (
                    <div>
                      <dt className="text-muted">XP awarded</dt>
                      <dd className="font-mono font-semibold text-brand-blue">+{formatXp(item.xpAwarded)}</dd>
                    </div>
                  ) : null}
                  {item.feedbackDate ? (
                    <div>
                      <dt className="text-muted">Reviewed</dt>
                      <dd>{item.feedbackDate}</dd>
                    </div>
                  ) : null}
                </dl>
                {item.secureVideoUrl ? (
                  <a
                    href={item.secureVideoUrl}
                    className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-brand-blue underline-offset-2 hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Open secure video
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="mt-10">
        {isLive ? (
          <DashboardXpSection
            rows={data.recentXp}
            warning={data.xpWarning}
            totalAvailableRows={data.recentXpTotal}
          />
        ) : null}
      </div>

      <section
        id="dashboard-weekly"
        className="scroll-mt-24 mt-10"
        aria-labelledby="dashboard-weekly-heading"
      >
        <SectionMarker label="Weekly progress" title="Season timeline" />
        {data.weeklyProgress.length === 0 ? (
          <p className={cn(catalogPanelClass({ tint: "neutral" }), "text-sm text-muted")} role="status">
            Weekly summaries will appear after your first logged week.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.weeklyProgress.map((week) => (
              <article key={week.key} className={catalogPanelClass({ tint: "neutral" })} data-testid="dashboard-week-card">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-display text-lg text-foreground">{week.weekLabel}</h3>
                  <StatusBadge tone={week.perfectWeek ? "success" : "neutral"}>
                    {week.perfectWeekStatusLabel}
                  </StatusBadge>
                </div>
                {week.weekDateRange ? (
                  <p className="mt-1 text-xs text-muted">{week.weekDateRange}</p>
                ) : null}
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="text-muted">Shots</dt>
                    <dd className="font-mono font-semibold text-foreground">{formatShots(week.totalShots)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Days logged</dt>
                    <dd>{week.daysLogged ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Weekly XP</dt>
                    <dd className="font-mono text-brand-blue">
                      {week.weeklyXp != null ? `+${formatXp(week.weeklyXp)}` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Goal</dt>
                    <dd>{week.goalCompletionPercent != null ? `${week.goalCompletionPercent}%` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Homework</dt>
                    <dd>{week.homeworkStatus ?? (week.homeworkCompleted ? "Complete" : "—")}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Zoom</dt>
                    <dd>{week.zoomStatus ?? "—"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        id="dashboard-awards"
        className="scroll-mt-24 mt-10 mb-4"
        aria-labelledby="dashboard-awards-heading"
      >
        <SectionMarker label="Awards" title="Season recognition" />
        {data.awards.length === 0 ? (
          <p className={cn(catalogPanelClass({ tint: "neutral" }), "text-sm text-muted")} role="status">
            No season awards recorded yet. Keep competing — awards appear here when earned.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {data.awards.map((award) => (
              <article key={award.key} className={catalogPanelClass({ tint: "accent" })} data-testid="dashboard-award-card">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-foreground">{award.awardName}</h3>
                  <StatusBadge tone={award.publiclyVisible ? "success" : "neutral"}>
                    {award.recipientStatus}
                  </StatusBadge>
                </div>
                {award.weekLabel ? (
                  <p className="mt-1 text-xs text-muted">{award.weekLabel}</p>
                ) : null}
                {award.reason ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{award.reason}</p>
                ) : null}
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  {award.awardDate ? (
                    <div>
                      <dt className="text-muted">Awarded</dt>
                      <dd>{award.awardDate}</dd>
                    </div>
                  ) : null}
                  {award.amount != null ? (
                    <div>
                      <dt className="text-muted">Value</dt>
                      <dd className="font-mono">${award.amount.toFixed(0)}</dd>
                    </div>
                  ) : null}
                  {award.deliveryStatus ? (
                    <div>
                      <dt className="text-muted">Delivery</dt>
                      <dd>{award.deliveryStatus}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>
    </ProgramPage>
  );
}

function EnrollmentCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(scCardInset(), "px-4 py-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
