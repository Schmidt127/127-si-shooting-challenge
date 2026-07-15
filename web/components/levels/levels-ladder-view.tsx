import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { IconLevel } from "@/components/icons/shoot-icons";
import { catalogCardClass, catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";

type LevelsLadderViewProps = {
  data: LevelLadderData;
};

function XpMeter({
  xp,
  maxXp,
  className = "",
}: {
  xp: number;
  maxXp: number;
  className?: string;
}) {
  const width = maxXp > 0 ? Math.max(8, Math.round((xp / maxXp) * 100)) : 8;

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/10 ${className}`}>
      <div
        className="h-full rounded-full bg-brand-orange"
        style={{ width: `${width}%` }}
        role="presentation"
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
      <article className={catalogCardClass(isPinnacle ? { featured: "gold" } : undefined)}>
        <div className="flex items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-5 sm:py-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br font-mono text-base font-black sm:h-12 sm:w-12 sm:text-lg ${style.gradient} ${style.text} ring-1 ${style.ring}`}
          >
            {level.sortOrder || level.rank || "—"}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 sm:gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted">
                {tierLabel}
              </p>
              <LevelBadge level={level.displayName} />
            </div>
            <h3 className="text-base font-bold leading-tight text-foreground transition group-hover:text-accent-soft sm:text-lg">
              {level.name}
            </h3>
            <p className="text-xs leading-snug text-muted sm:text-sm">
              {formatXp(level.xpRequired)} lifetime XP
              {level.xpFromPrevious > 0
                ? ` · +${formatXp(level.xpFromPrevious)} from prior tier`
                : ""}
            </p>
            <XpMeter xp={level.xpRequired} maxXp={maxXp} className="mt-1" />
          </div>

          {level.coverImage ? (
            <div className="flex shrink-0 items-center justify-center rounded-lg border border-white/5 bg-black/20 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={level.coverImage.url}
                alt={level.displayName || level.name ? `${level.displayName || level.name} cover` : "Level cover"}
                className="max-h-24 max-w-32 object-contain sm:max-h-28 sm:max-w-36"
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-white/5 px-4 py-2 sm:px-5">
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
          icon={<IconLevel size={32} />}
          subtitle="From first shots to G.O.A.T. — every tier shows the XP threshold and what it takes to break through."
        >
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted">
            {data.totalLevels} active tiers · pinnacle first
          </p>
        </DisplayHeading>

        <div className="relative mt-14 space-y-5">
          <div
            className="absolute bottom-4 left-7 top-4 hidden w-px bg-gradient-to-b from-court-gold/50 via-brand-orange/30 to-brand-blue/20 sm:block"
            aria-hidden
          />
          {data.levels.map((level, index) => (
            <div key={level.id} className="relative sm:pl-14">
              <span
                className="absolute left-4 top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-orange/50 bg-background sm:block"
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
      <div className={catalogStatePanelClass()}>
        <h1 className="font-display text-2xl text-foreground">Levels coming soon</h1>
        <p className="mt-3 text-muted">
          Active level tiers will appear here once marked Active in Airtable.
        </p>
        <Link href="/" className="btn-secondary mt-6">
          ← Shooting Challenge
        </Link>
      </div>
    </div>
  );
}

export function LevelsErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24">
      <div className={catalogStatePanelClass(true)}>
        <h1 className="font-display text-2xl text-foreground">Could not load levels</h1>
        <p className="mt-3 text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}
