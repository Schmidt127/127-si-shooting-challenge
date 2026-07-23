import Link from "next/link";

import { catalogCardClass, catalogPanelClass } from "@/components/catalog/catalog-surface";
import { IconBolt, IconMedal, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import { EmptyState, ErrorState, LevelIndicator, StatTile, StatusBadge } from "@/components/ui";
import type { AthleteProfileModel } from "@/lib/data/athlete-profile";
import { formatGrade, formatXp } from "@/lib/formatters";

type AthleteProfileViewProps = {
  data: AthleteProfileModel;
  /** Extra missing fields when status is partial. */
  missing?: string[];
};

export function AthleteProfileView({ data, missing = [] }: AthleteProfileViewProps) {
  const unlocked = data.achievements.filter((a) => a.unlocked);

  return (
    <ProgramPage
      eyebrow="Athlete profile"
      title={data.athlete.displayName}
      description={`${data.athlete.school} · ${formatGrade(data.athlete.grade)} · ${data.seasonLabel}`}
      heroVariant="contrast"
      ambientVariant="default"
      actions={
        <CtaLink href="/leaderboard" variant="cta">
          Season leaderboard
        </CtaLink>
      }
      meta={
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span role="note">{data.privacyNote}</span>
          {data.source === "mock" ? (
            <StatusBadge tone="warn">Demo data — not a live authenticated profile</StatusBadge>
          ) : null}
          {data.mayBeStale ? (
            <StatusBadge tone="neutral">Data may be briefly stale</StatusBadge>
          ) : null}
          {missing.length > 0 ? (
            <StatusBadge tone="warn">Partial data</StatusBadge>
          ) : null}
        </div>
      }
    >
      <section className="grid gap-6 lg:grid-cols-[1.35fr_1fr]" aria-label="Athlete identity">
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
              <p className="mt-1 text-xs text-muted">
                Enrollment{" "}
                {data.enrollment.active == null
                  ? "link pending"
                  : data.enrollment.active
                    ? "active"
                    : "inactive"}
                {data.enrollment.schoolYear ? ` · ${data.enrollment.schoolYear}` : ""}
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
            {data.gateStatus.publicSummary ? (
              <p className="mt-2 text-sm text-muted" role="status">
                Gate: {data.gateStatus.publicSummary}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3">
          <StatTile
            label="Shots counted"
            value={data.shotsCounted == null ? "—" : String(data.shotsCounted)}
            icon={IconTrophy}
            tint="blue"
            hint={data.shotsCounted == null ? "Awaiting live enrollment" : undefined}
          />
          <StatTile
            label="Days logged"
            value={data.daysLogged == null ? "—" : String(data.daysLogged)}
            icon={IconBolt}
            tint="amber"
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

      {missing.length > 0 ? (
        <section className="mt-8" aria-label="Partial data notice" role="status">
          <div className={catalogPanelClass({ tint: "neutral" })}>
            <p className="font-semibold text-foreground">Some profile sections are incomplete</p>
            <p className="mt-1 text-sm text-muted">
              Missing: {missing.join(", ")}. Live wiring waits on the athlete auth decision
              (SC-112).
            </p>
          </div>
        </section>
      ) : null}

      <section className="mt-10" aria-label="Homework video Zoom weekly">
        <SectionMarker label="Season activity" title="Homework, video, Zoom, weekly" />
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className={catalogPanelClass({ tint: "neutral" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Homework
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {data.homework.title ?? "No homework linked"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.homework.statusLabel ?? "Status unavailable"}
            </p>
          </li>
          <li className={catalogPanelClass({ tint: "neutral" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Video feedback
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {data.video.title ?? "No video feedback linked"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.video.statusLabel ?? "Status unavailable"}
            </p>
          </li>
          <li className={catalogPanelClass({ tint: "neutral" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Zoom
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {data.zoom.seasonCredits == null
                ? "Credits not loaded"
                : `${data.zoom.seasonCredits} season credits`}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.zoom.latestLabel ?? "No Zoom activity published"}
            </p>
          </li>
          <li className={catalogPanelClass({ tint: "neutral" })}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Weekly summary
            </p>
            <p className="mt-2 font-semibold text-foreground">
              {data.weeklySummary.weekLabel ?? "Week not linked"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {data.weeklySummary.shots == null || data.weeklySummary.goal == null
                ? "Shot totals unavailable"
                : `${data.weeklySummary.shots} / ${data.weeklySummary.goal} shots`}
            </p>
          </li>
        </ul>
      </section>

      <section className="mt-10" aria-label="Milestones">
        <SectionMarker label="Progress" title="Milestones" />
        {data.milestones.length === 0 ? (
          <div className={catalogPanelClass({ tint: "neutral" })} role="status">
            <p className="font-semibold text-foreground">No milestones to show</p>
            <p className="mt-1 text-sm text-muted">
              Milestone progress appears when publishable season totals exist.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {data.milestones.map((m) => (
              <li key={m.id} className={catalogPanelClass({ tint: "neutral" })}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                  {m.label}
                </p>
                <p className="mt-2 font-mono text-sm text-foreground">{m.value}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10" aria-label="Achievements and levels">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionMarker
            label="Badges"
            title="Achievements & levels"
            countLabel={`${unlocked.length} earned · ${data.achievements.length - unlocked.length} locked`}
            className="mb-0"
          />
          <CtaLink href="/achievements" variant="secondary" size="sm">
            Full catalog
          </CtaLink>
        </div>
        <p className="mt-2 text-sm text-muted">
          {unlocked.length} earned · {data.achievements.length - unlocked.length} locked · Level{" "}
          {data.athlete.level}
        </p>
        {data.achievements.length === 0 ? (
          <div
            className={`mt-4 ${catalogPanelClass({ tint: "neutral" })}`}
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-foreground">No achievements published yet</p>
            <p className="mt-1 text-sm text-muted">
              Check back after the season catalog is linked to this public profile.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.achievements.map((a) => (
              <li key={a.id}>
                <Link href="/achievements" className={`block h-full ${catalogCardClass()}`}>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <StatusBadge tone={a.unlocked ? "success" : "neutral"}>
                        {a.unlocked ? "Earned" : "Locked"}
                      </StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      {a.unlocked ? "Public accomplishment" : "Keep shooting to unlock"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 mb-2" aria-label="Recent activity">
        <SectionMarker label="Feed" title="Recent activity" />
        {data.recentActivity.length === 0 ? (
          <div
            className={catalogPanelClass({ tint: "neutral" })}
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-foreground">No recent public activity</p>
            <p className="mt-1 text-sm text-muted">
              Activity appears here when publishable events exist.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3">
            {data.recentActivity.map((item) => (
              <li key={item.id} className={catalogPanelClass({ tint: "neutral" })}>
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.detail}</p>
                {item.href ? (
                  <CtaLink href={item.href} variant="link" className="mt-2 px-0">
                    Open
                  </CtaLink>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </ProgramPage>
  );
}

export function AthleteProfileEmptyState({ slug }: { slug: string }) {
  return (
    <ProgramPage
      eyebrow="Athlete profile"
      title="Athlete profile"
      description="Public profiles for athletes published in the Shooting Challenge season."
      heroVariant="contrast"
      ambientVariant="default"
    >
      <EmptyState
        title="Profile not found"
        description={`No public athlete is published for “${slug}”. Try the demo profile at /athletes/demo-athlete or /athletes/schmidt. Private contact data is never shown here.`}
        action={
          <CtaLink href="/leaderboard" variant="secondary">
            ← Back to leaderboard
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}

export function AthleteProfileMissingLinkState({
  slug,
  reason,
}: {
  slug: string;
  reason: string;
}) {
  return (
    <ProgramPage
      eyebrow="Athlete profile"
      title="Profile not available yet"
      description="Live athlete profiles wait on the authentication decision and published enrollment links."
      heroVariant="contrast"
      ambientVariant="default"
    >
      <EmptyState
        title={`No live link for “${slug}”`}
        description={reason}
        action={
          <div className="flex flex-wrap gap-3">
            <CtaLink href="/athletes/demo-athlete" variant="cta">
              Open demo profile
            </CtaLink>
            <CtaLink href="/athletes/schmidt" variant="secondary">
              Open Schmidt demo
            </CtaLink>
          </div>
        }
      />
    </ProgramPage>
  );
}

export function AthleteProfileErrorState({ message }: { message?: string }) {
  return (
    <ProgramPage
      eyebrow="Athlete profile"
      title="Athlete profile"
      description="Public profiles for athletes published in the Shooting Challenge season."
      heroVariant="contrast"
      ambientVariant="default"
    >
      <ErrorState
        title="Couldn’t load profile"
        message={
          message ??
          "Something went wrong loading this public profile. Try again in a moment."
        }
        action={
          <CtaLink href="/dashboard" variant="secondary">
            Go to dashboard
          </CtaLink>
        }
      />
    </ProgramPage>
  );
}
