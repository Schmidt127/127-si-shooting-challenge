import Link from "next/link";

import { formatRelativeUpdate, formatXp } from "@/lib/formatters";
import type { LeaderboardData } from "@/types/leaderboard";

import { LeaderboardPodium } from "./leaderboard-podium";
import { LeaderboardTable } from "./leaderboard-table";

type LeaderboardViewProps = {
  data: LeaderboardData;
};

function LeaderboardStats({ data }: LeaderboardViewProps) {
  const totalXp = data.entries.reduce((sum, entry) => sum + entry.xp, 0);
  const totalShots = data.entries.reduce((sum, entry) => sum + entry.totalShots, 0);
  const topXp = data.entries[0]?.xp ?? 0;

  const stats = [
    { label: "Athletes", value: String(data.entries.length) },
    { label: "Combined XP", value: formatXp(totalXp) },
    { label: "Shots Logged", value: formatXp(totalShots) },
    { label: "Leader XP", value: formatXp(topXp) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-sm"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
            {stat.label}
          </p>
          <p className="mt-1 font-mono text-xl font-bold text-foreground sm:text-2xl">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function LeaderboardView({ data }: LeaderboardViewProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute -right-20 top-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-500/8 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <p className="text-xs uppercase tracking-[0.25em] text-muted">
              Updated {formatRelativeUpdate(data.updatedAt)}
            </p>
          </div>

          <div className="mt-6 text-center sm:mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-accent-soft">
              127 Sports Intensity
            </p>
            <h1 className="mt-3 bg-gradient-to-br from-white via-white to-orange-200 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
              Shooting Challenge
            </h1>
            <p className="mt-2 text-lg font-medium text-muted sm:text-xl">Leaderboard</p>
            <p className="mt-3 inline-flex rounded-full border border-accent/25 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent-soft">
              {data.seasonLabel}
            </p>
          </div>

          <div className="mt-8">
            <LeaderboardStats data={data} />
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
    </div>
  );
}

export function LeaderboardEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
        <h1 className="mt-6 text-2xl font-bold text-foreground">Leaderboard warming up</h1>
        <p className="mt-3 text-muted">
          No active athletes with XP yet. Check back soon as submissions roll in.
        </p>
        <Link
          href="/shooting-challenge"
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
          href="/shooting-challenge"
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
        >
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}
