import type { ReactNode } from "react";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AmbientPage } from "@/components/catalog/ambient-page";
import { IconBasketball, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import { CtaLink } from "@/components/site";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatRelativeUpdate, formatXp } from "@/lib/formatters";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { LeaderboardData } from "@/types/leaderboard";

type PublicDisplayViewProps = {
  data: LeaderboardData;
};

export function PublicDisplayView({ data }: PublicDisplayViewProps) {
  const topTen = data.entries.slice(0, 10);

  return (
    <AmbientPage variant="leaderboard">
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="court-lines sc-contrast flex flex-wrap items-center justify-between gap-6 rounded-lg border px-5 py-6 shadow-site-md sm:px-8">
            <div className="flex items-center gap-4">
              <BrandLogo variant="circle" className="h-14 w-14" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent-soft">
                  127 Sports Intensity
                </p>
                <h1 className="font-display mt-1 text-3xl text-contrast-fg sm:text-4xl lg:text-5xl">
                  {data.seasonLabel}
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-contrast-muted">
                Live leaderboard
              </p>
              <p className="mt-1 text-sm text-contrast-muted">
                Updated {formatRelativeUpdate(data.updatedAt)}
              </p>
              <CtaLink
                href="/leaderboard"
                variant="contrast"
                size="sm"
                className="mt-3"
              >
                Full site view →
              </CtaLink>
            </div>
          </header>

          <div className="mt-10">
            <LeaderboardPodium entries={data.entries.slice(0, 3)} />
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topTen.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-lg border bg-card p-4 shadow-site-sm ${
                  entry.rank === 1 ? "border-court-gold/35" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-muted">#{entry.rank}</span>
                  <AthleteAvatar
                    name={entry.displayName}
                    headshotUrl={entry.headshot?.url}
                    size="md"
                    rank={entry.rank <= 3 ? (entry.rank as 1 | 2 | 3) : undefined}
                  />
                </div>
                <p className="mt-3 truncate text-base font-bold text-foreground">
                  {entry.displayName}
                </p>
                <LevelBadge level={entry.level} size="sm" />
                <p className="mt-2 font-mono text-sm font-semibold text-accent-soft">
                  {formatXp(entry.xp)} XP
                </p>
              </div>
            ))}
          </div>

          <footer className="mt-12 flex flex-wrap items-center justify-center gap-3 text-center text-xs text-muted">
            <IconBasketball size={14} className="text-brand-blue" />
            <span>Shooting Challenge · Level → XP → Total Shots</span>
            <IconTrophy size={14} className="text-court-gold" />
          </footer>
        </div>
      </div>
    </AmbientPage>
  );
}

function PublicDisplayChrome({ children }: { children: ReactNode }) {
  return (
    <AmbientPage variant="leaderboard">
      <div className="min-h-[calc(100vh-8rem)] px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="court-lines sc-contrast flex flex-wrap items-center justify-between gap-6 rounded-lg border px-5 py-6 shadow-site-md sm:px-8">
            <div className="flex items-center gap-4">
              <BrandLogo variant="circle" className="h-14 w-14" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent-soft">
                  127 Sports Intensity
                </p>
                <h1 className="font-display mt-1 text-3xl text-contrast-fg sm:text-4xl lg:text-5xl">
                  Public display
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-contrast-muted">
                Live leaderboard
              </p>
              <CtaLink href="/leaderboard" variant="contrast" size="sm" className="mt-3">
                Full site view →
              </CtaLink>
            </div>
          </header>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </AmbientPage>
  );
}

export function PublicDisplayEmptyState() {
  return (
    <PublicDisplayChrome>
      <EmptyState
        title={EMPTY_STATE_COPY.publicDisplay.title}
        description={EMPTY_STATE_COPY.publicDisplay.description}
        icon={<IconTrophy size={40} />}
        action={
          <CtaLink href="/" variant="secondary">
            ← Back to overview
          </CtaLink>
        }
      />
    </PublicDisplayChrome>
  );
}

export function PublicDisplayErrorState({ message }: { message: string }) {
  return (
    <PublicDisplayChrome>
      <ErrorState
        title="Display unavailable"
        message={message}
        action={
          <CtaLink href="/" variant="secondary">
            ← Back to overview
          </CtaLink>
        }
      />
    </PublicDisplayChrome>
  );
}
