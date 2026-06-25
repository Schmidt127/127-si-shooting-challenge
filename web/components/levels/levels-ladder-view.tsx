import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";

type LevelsLadderViewProps = {
  data: LevelLadderData;
};

function XpMeter({ xp, maxXp }: { xp: number; maxXp: number }) {
  const width = maxXp > 0 ? Math.max(8, Math.round((xp / maxXp) * 100)) : 8;

  return (
    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand-blue via-accent to-amber-300"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function LevelLadderCard({
  level,
  maxXp,
  index,
  isPinnacle,
}: {
  level: LevelDefinition;
  maxXp: number;
  index: number;
  isPinnacle: boolean;
}) {
  const style = getLevelStyle(level.displayName);
  const tierLabel = level.rank > 0 ? `Tier ${level.rank}` : `Step ${index + 1}`;

  return (
    <Link href={`/levels/${level.id}`} className="group relative block">
      <article
        className={`relative overflow-hidden rounded-2xl border transition duration-300 ${
          isPinnacle
            ? "border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-card/80 to-violet-900/20 shadow-[0_0_50px_-12px_rgba(251,191,36,0.4)]"
            : "border-white/10 bg-card/55 hover:border-white/20 hover:bg-card/75"
        }`}
      >
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4 sm:w-56">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-mono text-lg font-black ${style.gradient} ${style.text} ring-1 ${style.ring}`}
            >
              {level.sortOrder || level.rank || "—"}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted">{tierLabel}</p>
              <LevelBadge level={level.displayName} size="lg" />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-bold text-foreground transition group-hover:text-accent-soft">
              {level.name}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {formatXp(level.xpRequired)} lifetime XP
              {level.xpFromPrevious > 0 ? ` · +${formatXp(level.xpFromPrevious)} from prior tier` : ""}
            </p>
            <XpMeter xp={level.xpRequired} maxXp={maxXp} />
          </div>

          {level.coverImage ? (
            <div className="flex shrink-0 items-center justify-center self-center rounded-xl border border-white/5 bg-black/20 p-2 sm:ml-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={level.coverImage.url}
                alt=""
                className="max-h-32 max-w-44 object-contain sm:max-h-40 sm:max-w-52"
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/5 px-5 py-3 sm:px-6">
          <span className="text-sm font-semibold text-accent-soft opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
            Unlock requirements & details →
          </span>
        </div>
      </article>
    </Link>
  );
}

export function LevelsLadderView({ data }: LevelsLadderViewProps) {
  return (
    <AmbientPage variant="levels">
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow="Progression path"
          title="Climb the"
          titleAccent="level ladder"
          subtitle="From first shots to G.O.A.T. — every tier shows the XP threshold and what it takes to break through."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalLevels} active tiers · pinnacle first
          </p>
        </DisplayHeading>

        <div className="relative mt-14 space-y-5">
          <div
            className="absolute bottom-4 left-7 top-4 hidden w-px bg-gradient-to-b from-amber-400/60 via-accent/30 to-brand-blue/20 sm:block"
            aria-hidden
          />
          {data.levels.map((level, index) => (
            <div key={level.id} className="relative sm:pl-14">
              <span
                className="absolute left-4 top-8 hidden h-3 w-3 rounded-full border-2 border-accent/50 bg-background sm:block"
                aria-hidden
              />
              <LevelLadderCard
                level={level}
                maxXp={data.maxXp}
                index={index}
                isPinnacle={index === 0}
              />
            </div>
          ))}
        </div>
      </div>
    </AmbientPage>
  );
}

export function LevelsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-white/10 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">Levels coming soon</h1>
        <p className="mt-3 text-muted">Active level tiers will appear here once marked Active in Airtable.</p>
        <Link href="/shooting-challenge" className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent">
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function LevelsErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className="max-w-md rounded-2xl border border-red-500/20 bg-card/80 p-8 text-center backdrop-blur-xl">
        <h1 className="text-2xl font-bold text-foreground">Could not load levels</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
