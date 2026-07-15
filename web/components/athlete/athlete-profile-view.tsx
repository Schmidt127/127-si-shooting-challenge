import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { IconBolt, IconMedal, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import {
  InteractiveCard,
  LevelIndicator,
  PageFrame,
  PageHeader,
  StatTile,
  StatusBadge,
} from "@/components/ui";
import type { AthleteProfileModel } from "@/lib/data/athlete-profile";
import { formatGrade, formatXp } from "@/lib/formatters";

type AthleteProfileViewProps = {
  data: AthleteProfileModel;
};

export function AthleteProfileView({ data }: AthleteProfileViewProps) {
  const unlocked = data.achievements.filter((a) => a.unlocked);

  return (
    <AmbientPage variant="default">
      <PageFrame width="wide">
        <PageHeader
          eyebrow="Athlete profile"
          title={data.athlete.displayName}
          description={`${data.athlete.school} · ${formatGrade(data.athlete.grade)} · ${data.seasonLabel}`}
          actions={
            data.source === "mock" ? (
              <StatusBadge tone="warn">Demo data — public Airtable adapter pending</StatusBadge>
            ) : null
          }
        />

        <p className="text-sm text-muted" role="note">
          {data.privacyNote}
        </p>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className={catalogPanelClass({ tint: "neutral" })}>
            <div className="flex flex-wrap items-center gap-4">
              <AthleteAvatar
                name={data.athlete.displayName}
                headshotUrl={data.athlete.avatarUrl}
                size="lg"
              />
              <div className="min-w-0">
                <h2 className="font-display truncate text-2xl text-foreground">
                  {data.athlete.displayName}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Level · {data.athlete.level} · {formatXp(data.xp.total)} XP
                </p>
              </div>
            </div>
            <div className="mt-6">
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Level progress
              </h3>
              <div className="mt-2">
                <LevelIndicator
                  level={data.athlete.level}
                  totalXp={data.xp.total}
                  xpIntoLevel={data.xp.xpIntoLevel}
                  xpForNextLevel={data.xp.xpForNextLevel}
                  nextLevelLabel={data.xp.nextLevelLabel}
                />
              </div>
              <p className="mt-3 text-sm text-muted">
                {data.xp.nextLevelLabel
                  ? `Next: ${data.xp.nextLevelLabel} · ${formatXp(Math.max(0, data.xp.xpForNextLevel - data.xp.xpIntoLevel))} XP to go`
                  : "Top level for this season path"}
              </p>
            </div>
          </div>

          <div className="grid gap-3">
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
              tint="blue"
              hint={data.perfectWeek.earnedThisWeek ? "Earned this week" : "Keep shooting"}
            />
            <StatTile
              label="Achievements unlocked"
              value={String(unlocked.length)}
              icon={IconMedal}
              tint="blue"
            />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="milestones-heading">
          <h2 id="milestones-heading" className="font-display text-lg text-foreground">
            Milestones
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {data.milestones.map((m) => (
              <li key={m.id} className={catalogPanelClass({ tint: "neutral" })}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {m.label}
                </p>
                <p className="mt-2 font-mono text-sm text-foreground">{m.value}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="achievements-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="achievements-heading" className="font-display text-lg text-foreground">
                Achievements &amp; levels
              </h2>
              <p className="mt-1 text-sm text-muted">
                {unlocked.length} earned · {data.achievements.length - unlocked.length} locked ·
                Level {data.athlete.level}
              </p>
            </div>
            <Link
              href="/achievements"
              className="text-sm font-semibold text-brand-blue hover:underline"
            >
              Full catalog
            </Link>
          </div>
          {data.achievements.length === 0 ? (
            <div
              className={`mt-3 ${catalogPanelClass({ tint: "neutral" })}`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-foreground">No achievements published yet</p>
              <p className="mt-1 text-sm text-muted">
                Check back after the season catalog is linked to this public profile.
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.achievements.map((a) => (
                <li key={a.id}>
                  <Link href="/achievements" className="block h-full">
                    <InteractiveCard className="h-full p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{a.name}</p>
                        <StatusBadge tone={a.unlocked ? "success" : "neutral"}>
                          {a.unlocked ? "Earned" : "Locked"}
                        </StatusBadge>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {a.unlocked ? "Public accomplishment" : "Keep shooting to unlock"}
                      </p>
                    </InteractiveCard>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 mb-4" aria-labelledby="activity-heading">
          <h2 id="activity-heading" className="font-display text-lg text-foreground">
            Recent activity
          </h2>
          {data.recentActivity.length === 0 ? (
            <div
              className={`mt-3 ${catalogPanelClass({ tint: "neutral" })}`}
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-foreground">No recent public activity</p>
              <p className="mt-1 text-sm text-muted">
                Activity appears here when publishable events exist.
              </p>
            </div>
          ) : (
            <ul className="mt-3 grid gap-3">
              {data.recentActivity.map((item) => (
                <li key={item.id} className={catalogPanelClass({ tint: "neutral" })}>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.detail}</p>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="mt-2 inline-block text-sm font-semibold text-brand-blue hover:underline"
                    >
                      Open
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageFrame>
    </AmbientPage>
  );
}

export function AthleteProfileEmptyState({ slug }: { slug: string }) {
  return (
    <AmbientPage variant="default">
      <PageFrame>
        <PageHeader
          eyebrow="Athlete profile"
          title="Profile not found"
          description={`No public athlete is published for “${slug}”.`}
        />
        <div className={`mt-6 ${catalogPanelClass({ tint: "neutral" })}`} role="status">
          <p className="text-sm text-muted">
            Public profiles only show athletes published for the Shooting Challenge season. Private
            contact data is never shown here.
          </p>
          <Link
            href="/leaderboard"
            className="mt-3 inline-block text-sm font-semibold text-brand-blue hover:underline"
          >
            Back to leaderboard
          </Link>
        </div>
      </PageFrame>
    </AmbientPage>
  );
}

export function AthleteProfileErrorState() {
  return (
    <AmbientPage variant="default">
      <PageFrame>
        <PageHeader
          eyebrow="Athlete profile"
          title="Couldn’t load profile"
          description="Something went wrong loading this public profile. Try again in a moment."
        />
        <div className={`mt-6 ${catalogPanelClass({ tint: "neutral" })}`} role="alert">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-brand-orange hover:underline"
          >
            Go to dashboard
          </Link>
        </div>
      </PageFrame>
    </AmbientPage>
  );
}
