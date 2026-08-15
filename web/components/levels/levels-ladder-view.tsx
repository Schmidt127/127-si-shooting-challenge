import Link from "next/link";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconLevel } from "@/components/icons/shoot-icons";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import { AccentRail, CtaLink, ProgramPage } from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { EmptyState, ErrorState } from "@/components/ui";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";
import { LEVELS_ORIENTATION_STEPS } from "./levels-orientation";

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
    <div className={`h-1.5 overflow-hidden rounded-full bg-brand-medium-gray/40 ${className}`}>
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
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {tierLabel}
              </p>
              <LevelBadge level={level.displayName} />
            </div>
            <h3 className="text-base font-bold leading-tight text-foreground transition group-hover:text-accent-soft sm:text-lg">
              {level.name}
            </h3>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              {formatXp(level.xpRequired)} lifetime XP
              {level.xpFromPrevious > 0
                ? ` · +${formatXp(level.xpFromPrevious)} from prior tier`
                : ""}
            </p>
            <XpMeter xp={level.xpRequired} maxXp={maxXp} className="mt-1" />
          </div>

          {level.coverImage ? (
            <div className="flex shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-brand-light-gray p-1.5">
              <SafeExternalImage
                src={level.coverImage.url}
                alt={
                  level.displayName || level.name
                    ? `${level.displayName || level.name} cover`
                    : "Level cover"
                }
                className="max-h-24 max-w-32 object-contain sm:max-h-28 sm:max-w-36"
              />
            </div>
          ) : null}
        </div>

        <div className="border-t border-border-subtle px-4 py-2 sm:px-5">
          <span className="text-sm font-semibold text-accent-soft opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100">
            Unlock requirements & details →
          </span>
        </div>
      </article>
    </Link>
  );
}

function LevelsOrientation() {
  return (
    <section aria-labelledby="levels-orientation-heading">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          Read the ladder
        </p>
        <h2 id="levels-orientation-heading" className="font-display mt-1 text-2xl text-foreground">
          Your path from current level to next level
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          Level names, XP thresholds, and gate criteria below come from the configured progression
          ladder. Open any card for the requirements behind that tier.
        </p>
      </div>
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LEVELS_ORIENTATION_STEPS.map((step, index) => (
          <li
            key={step.title}
            className="rounded-lg border border-border bg-card p-4 shadow-site-sm"
          >
            <p className="font-mono text-xs font-semibold text-brand-blue">0{index + 1}</p>
            <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function LevelsLadderView({ data }: LevelsLadderViewProps) {
  return (
    <ProgramPage
      eyebrow="Progression path"
      title={
        <>
          Climb the <span className="text-accent-soft">level ladder</span>
        </>
      }
      description="From first shots to G.O.A.T. — every tier shows the XP threshold and what it takes to break through."
      heroVariant="light"
      ambientVariant="levels"
      meta={
        <span>
          {data.totalLevels} active tiers · pinnacle first
        </span>
      }
    >
      <div className="space-y-8">
        <ProgramFeatureBanner title="Levels" caption="See the progression path from first shots to the highest tier." mark="LV" />
        <LevelsOrientation />
        <div className="mx-auto max-w-4xl">
          <AccentRail tone="gold" className="space-y-5">
            {data.levels.map((level, index) => (
              <div key={level.id} className="relative">
                <span
                  className="absolute -left-[1.65rem] top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-orange/50 bg-background sm:block"
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
          </AccentRail>
        </div>
      </div>
    </ProgramPage>
  );
}

export function LevelsEmptyState() {
  return (
    <ProgramPage
      eyebrow="Progression path"
      title={
        <>
          Climb the <span className="text-accent-soft">level ladder</span>
        </>
      }
      description="From first shots to G.O.A.T. — every tier shows the XP threshold and what it takes to break through."
      heroVariant="light"
      ambientVariant="levels"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner title="Levels" caption="See the progression path from first shots to the highest tier." mark="LV" />
        <EmptyState
          title={EMPTY_STATE_COPY.levels.title}
          description={EMPTY_STATE_COPY.levels.description}
          icon={<IconLevel size={40} />}
          action={
            <CtaLink href="/" variant="secondary">
              ← Shooting Challenge
            </CtaLink>
          }
        />
      </div>
    </ProgramPage>
  );
}

export function LevelsErrorState({ message }: { message: string }) {
  return (
    <ProgramPage
      eyebrow="Progression path"
      title={
        <>
          Climb the <span className="text-accent-soft">level ladder</span>
        </>
      }
      description="From first shots to G.O.A.T. — every tier shows the XP threshold and what it takes to break through."
      heroVariant="light"
      ambientVariant="levels"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner title="Levels" caption="See the progression path from first shots to the highest tier." mark="LV" />
        <ErrorState
          title="Could not load levels"
          message={message}
          action={
            <CtaLink href="/" variant="secondary">
              ← Shooting Challenge
            </CtaLink>
          }
        />
      </div>
    </ProgramPage>
  );
}
