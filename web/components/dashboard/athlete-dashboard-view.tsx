import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import {
  IconBolt,
  IconChevronRight,
  IconMedal,
  IconTarget,
  IconTrophy,
} from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import {
  InteractiveCard,
  LevelIndicator,
  PageFrame,
  PageHeader,
  ProgressMeter,
  StatTile,
  StatusBadge,
} from "@/components/ui";
import {
  homeworkStatusLabel,
  homeworkStatusTone,
  weeklyShotPercent,
  type AthleteDashboardModel,
} from "@/lib/data/athlete-dashboard";
import { formatGrade, formatShots, formatXp } from "@/lib/formatters";

type AthleteDashboardViewProps = {
  data: AthleteDashboardModel;
};

export function AthleteDashboardView({ data }: AthleteDashboardViewProps) {
  const weeklyPct = weeklyShotPercent(data.weekly.shots, data.weekly.goal);
  const unlockedCount = data.achievements.filter((item) => item.unlocked).length;

  return (
    <AmbientPage variant="default">
      <PageFrame width="wide">
        <PageHeader
          eyebrow="Athlete dashboard"
          title={data.athlete.displayName}
          description={`${data.athlete.school} · ${formatGrade(data.athlete.grade)} · ${data.seasonLabel}`}
          actions={
            data.source === "mock" ? (
              <StatusBadge tone="warn">Demo data — Airtable adapter pending</StatusBadge>
            ) : null
          }
        />

        <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className={catalogPanelClass({ tint: "neutral" })}>
            <div className="flex flex-wrap items-center gap-4">
              <AthleteAvatar
                name={data.athlete.displayName}
                headshotUrl={data.athlete.avatarUrl}
                size="lg"
              />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Identity
                </p>
                <h2 className="mt-1 truncate text-2xl font-bold text-foreground">
                  {data.athlete.displayName}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {data.athlete.school} · {formatGrade(data.athlete.grade)}
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
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile
              label={`${data.weekly.weekLabel} shots`}
              value={`${formatShots(data.weekly.shots)} / ${formatShots(data.weekly.goal)}`}
              icon={IconTarget}
              tint="blue"
              hint={`${weeklyPct}% of weekly goal`}
            />
            <StatTile
              label="Current streak"
              value={`${data.streakDays} days`}
              icon={IconBolt}
              tint="amber"
            />
            <StatTile
              label="Perfect Weeks"
              value={String(data.perfectWeek.seasonCount)}
              icon={IconTrophy}
              tint="orange"
              hint={
                data.perfectWeek.earnedThisWeek
                  ? "Earned this week"
                  : "In progress this week"
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

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className={catalogPanelClass({ tint: "blue" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-blue">
              Weekly progress
            </p>
            <h3 className="mt-2 text-xl font-bold text-foreground">Shot goal</h3>
            <div className="mt-5">
              <ProgressMeter
                label={`${data.weekly.weekLabel} target`}
                valueLabel={`${formatShots(data.weekly.shots)} of ${formatShots(data.weekly.goal)}`}
                percent={weeklyPct}
                tone="blue"
              />
            </div>
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
              <h3 className="mt-2 text-xl font-bold text-foreground">{data.nextAction.label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {data.nextAction.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft">
                Go <IconChevronRight size={16} />
              </span>
            </InteractiveCard>
          </Link>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className={catalogPanelClass({ tint: "neutral" })}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
                Homework
              </p>
              <StatusBadge tone={homeworkStatusTone(data.homework.status)}>
                {homeworkStatusLabel(data.homework.status)}
              </StatusBadge>
            </div>
            <h3 className="mt-3 text-lg font-bold text-foreground">{data.homework.title}</h3>
            <Link
              href={data.homework.href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft"
            >
              Open homework <IconChevronRight size={16} />
            </Link>
          </div>

          <div className={catalogPanelClass({ tint: "neutral" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Coach feedback
            </p>
            {data.feedback ? (
              <>
                <h3 className="mt-3 text-lg font-bold text-foreground">{data.feedback.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{data.feedback.preview}</p>
                <Link
                  href={data.feedback.href}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent-soft"
                >
                  View more <IconChevronRight size={16} />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">No new feedback yet.</p>
            )}
          </div>

          <div className={catalogPanelClass({ tint: "accent" })}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent-soft">
                Achievements
              </p>
              <Link href="/achievements" className="text-xs font-semibold text-muted hover:text-foreground">
                All
              </Link>
            </div>
            <ul className="mt-4 space-y-2">
              {data.achievements.slice(0, 3).map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                >
                  <span className="text-sm text-foreground">{item.name}</span>
                  <StatusBadge tone={item.unlocked ? "success" : "neutral"}>
                    {item.unlocked ? "Unlocked" : "Locked"}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-8 text-center font-mono text-xs text-muted">
          Lifetime XP {formatXp(data.xp.total)} · Demo slug /{data.athlete.slug}
        </p>
      </PageFrame>
    </AmbientPage>
  );
}
