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

import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardTable } from "./leaderboard-table";
import { LeaderboardTiebreakerLegend } from "./leaderboard-tiebreaker-legend";

type LeaderboardViewProps = {
  data: LeaderboardData;
};

function LeaderboardStats({ data }: LeaderboardViewProps) {
  const totalXp = data.entries.reduce((sum, entry) => sum + entry.xp, 0);
  const totalShots = data.entries.reduce((sum, entry) => sum + entry.totalShots, 0);
  const topXp = data.entries[0]?.xp ?? 0;

  const stats = [
    { label: "Athletes", value: String(data.entries.length), icon: IconBasketball, tint: "text-brand-blue" },
    { label: "Combined XP", value: formatXp(totalXp), icon: IconBolt, tint: "text-amber-300" },
    { label: "Shots Logged", value: formatXp(totalShots), icon: IconTarget, tint: "text-cyan-300" },
    { label: "Leader XP", value: formatXp(topXp), icon: IconTrophy, tint: "text-accent-soft" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-lg bg-black/25 p-1.5 ${stat.tint}`}>
                <Icon size={16} />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
                {stat.label}
              </p>
            </div>
            <p className="mt-2 font-mono text-xl font-bold text-foreground sm:text-2xl">
              {stat.value}
            </p>
          </div>
        );
      })}
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
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/30 hover:text-accent-soft"
            >
              <IconRank size={14} /> Display mode
            </Link>
          </div>

          <div className="mt-8 text-center">
            <div className="mx-auto mb-4 inline-flex items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-300">
              <IconTrophy size={36} className="drop-shadow-[0_0_16px_rgba(251,191,36,0.45)]" />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent-soft">
              127 Sports Intensity
            </p>
            <h1 className="mt-3 bg-gradient-to-br from-white via-white to-orange-200 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              Season Leaderboard
            </h1>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-soft">
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

        {data.entries.length >= 3 ? (
          <LeaderboardPodium entries={data.entries} />
        ) : null}

        {data.entries.length > 3 ? (
          <LeaderboardTable entries={data.entries} />
        ) : data.entries.length > 0 && data.entries.length <= 3 ? (
          <p className="text-center text-sm text-muted">
            Only {data.entries.length} athlete{data.entries.length === 1 ? "" : "s"} on the board so
            far — more challengers coming soon.
          </p>
        ) : null}
      </div>
    </AmbientPage>
  );
}

export function LeaderboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto inline-flex rounded-2xl border border-white/10 bg-white/5 p-4 text-muted">
          <IconTrophy size={40} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-foreground">Leaderboard warming up</h1>
        <p className="mt-3 text-muted">
          No active athletes with XP yet. Check back soon as submissions roll in.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function LeaderboardErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-red-500/20 bg-card/80 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">Could not load leaderboard</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}
