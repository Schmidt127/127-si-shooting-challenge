import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { AmbientPage } from "@/components/catalog/ambient-page";
import {
  IconBasketball,
  IconBolt,
  IconRank,
  IconTarget,
  IconTrophy,
} from "@/components/icons/shoot-icons";
import { formatRelativeUpdate, formatXp } from "@/lib/formatters";
import type { LeaderboardData } from "@/types/leaderboard";

import { EmptyState, ErrorState, StatTile } from "@/components/ui";

import { LeaderboardBoard } from "./leaderboard-board";
import { LeaderboardTiebreakerLegend } from "./leaderboard-tiebreaker-legend";

type LeaderboardViewProps = {
  data: LeaderboardData;
};

function LeaderboardStats({ data }: LeaderboardViewProps) {
  const totalXp = data.entries.reduce((sum, entry) => sum + entry.xp, 0);
  const totalShots = data.entries.reduce((sum, entry) => sum + entry.totalShots, 0);
  const topXp = data.entries[0]?.xp ?? 0;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile
        label="Athletes"
        value={String(data.entries.length)}
        icon={IconBasketball}
        tint="blue"
      />
      <StatTile label="Combined XP" value={formatXp(totalXp)} icon={IconBolt} tint="amber" />
      <StatTile label="Shots Logged" value={formatXp(totalShots)} icon={IconTarget} tint="blue" />
      <StatTile label="Leader XP" value={formatXp(topXp)} icon={IconTrophy} tint="orange" />
    </div>
  );
}

export function LeaderboardView({ data }: LeaderboardViewProps) {
  return (
    <AmbientPage variant="leaderboard">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <BrandLogo variant="circle" className="h-10 w-10 opacity-90" />
              <p className="text-xs uppercase tracking-[0.25em] text-muted">
                Updated {formatRelativeUpdate(data.updatedAt)}
              </p>
            </div>
            <Link
              href="/public-display"
              className="inline-flex min-h-[2.75rem] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-semibold text-muted transition hover:border-brand-orange/30 hover:text-accent-soft"
            >
              <IconRank size={14} /> Display mode
            </Link>
          </div>

          <div className="mt-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl border border-court-gold/30 bg-court-gold/10 p-3 text-court-gold">
              <IconTrophy size={36} />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent-soft">
              127 Sports Intensity
            </p>
            <h1 className="font-display mt-3 text-4xl text-foreground sm:text-5xl lg:text-6xl">
              Season Leaderboard
            </h1>
            <p className="mt-3 inline-flex items-center gap-2 rounded-md border border-brand-orange/25 bg-brand-orange/10 px-4 py-1.5 text-sm font-medium text-accent-soft">
              <IconBasketball size={16} />
              {data.seasonLabel}
            </p>
          </div>

          <div className="mt-8">
            <LeaderboardStats data={data} />
          </div>

          <div className="mt-6">
            <LeaderboardTiebreakerLegend />
          </div>
        </header>

        <LeaderboardBoard entries={data.entries} />
      </div>
    </AmbientPage>
  );
}

export function LeaderboardEmptyState() {
  return (
    <EmptyState
      title="Leaderboard warming up"
      description="No active athletes with XP yet. Check back soon as submissions roll in."
      icon={<IconTrophy size={40} />}
      action={
        <Link href="/" className="btn-secondary">
          ← Shooting Challenge
        </Link>
      }
    />
  );
}

export function LeaderboardErrorState({ message }: { message: string }) {
  return (
    <ErrorState
      title="Could not load leaderboard"
      message={message}
      action={
        <Link href="/" className="btn-secondary">
          ← Shooting Challenge
        </Link>
      }
    />
  );
}
