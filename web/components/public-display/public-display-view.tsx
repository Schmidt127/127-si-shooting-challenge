import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AmbientPage } from "@/components/catalog/ambient-page";
import { IconBasketball, IconTrophy } from "@/components/icons/shoot-icons";
import { AthleteAvatar } from "@/components/leaderboard/athlete-avatar";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LevelBadge } from "@/components/leaderboard/level-badge";
import { formatRelativeUpdate, formatXp } from "@/lib/formatters";
import type { LeaderboardData } from "@/types/leaderboard";

type PublicDisplayViewProps = {
  data: LeaderboardData;
};

export function PublicDisplayView({ data }: PublicDisplayViewProps) {
  const topTen = data.entries.slice(0, 10);

  return (
    <AmbientPage variant="leaderboard">
      <div className="min-h-[calc(100vh-8rem)] bg-gradient-to-b from-black/40 via-background to-background px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-6 border-b border-white/10 pb-8">
            <div className="flex items-center gap-4">
              <BrandLogo variant="circle" className="h-14 w-14" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.35em] text-accent-soft">
                  127 Sports Intensity
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {data.seasonLabel}
                </h1>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">
                Live leaderboard
              </p>
              <p className="mt-1 text-sm text-muted">Updated {formatRelativeUpdate(data.updatedAt)}</p>
              <Link
                href="/leaderboard"
                className="mt-3 inline-block text-xs font-semibold text-accent-soft hover:underline"
              >
                Full site view →
              </Link>
            </div>
          </header>

          <div className="mt-10">
            <LeaderboardPodium entries={data.entries.slice(0, 3)} />
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {topTen.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-2xl border bg-black/30 p-4 backdrop-blur-sm ${
                  entry.rank === 1
                    ? "border-amber-400/35 ring-1 ring-amber-400/20"
                    : "border-white/10"
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
                <p className="mt-3 truncate text-base font-bold text-foreground">{entry.displayName}</p>
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
            <IconTrophy size={14} className="text-amber-300" />
          </footer>
        </div>
      </div>
    </AmbientPage>
  );
}

export function PublicDisplayErrorState({ message }: { message: string }) {
  return (
    <AmbientPage variant="leaderboard">
      <div className="mx-auto max-w-lg px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Display unavailable</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <Link href="/" className="mt-6 inline-block text-sm text-accent-soft hover:underline">
          ← Back to overview
        </Link>
      </div>
    </AmbientPage>
  );
}
