import Link from "next/link";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { IconLevel } from "@/components/icons/shoot-icons";
import { SafeExternalImage } from "@/components/media/safe-external-image";
import { AccentRail, CtaLink, ProgramPage } from "@/components/site";
import { ProgramFeatureBanner } from "@/components/site/program-feature-image";
import { FEATURE_BANNER_ARIA } from "@/lib/seo/program-facts";
import { EmptyState, ErrorState } from "@/components/ui";
import { scCardPanel } from "@/components/ui/sc-card";
import { getLevelDisplayNumber, compareLevels } from "@/lib/data/levels";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import { EMPTY_STATE_COPY, LEVEL_GATE_COPY } from "@/lib/release/public-surface";
import type { LevelDefinition, LevelLadderData } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";
import { LEVELS_PROGRESS_INTRO, LEVELS_PROGRESS_POINTS } from "./levels-orientation";

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

function LevelNumberBadge({ level }: { level: LevelDefinition }) {
  const style = getLevelStyle(level.displayName);
  const levelNumber = getLevelDisplayNumber(level);
  const displayValue = levelNumber ?? "—";

  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        Level
      </span>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br font-mono text-base font-black sm:h-12 sm:w-12 sm:text-lg ${style.gradient} ${style.text} ring-1 ${style.ring}`}
        aria-label={levelNumber ? `Level ${levelNumber}` : "Level number unavailable"}
        data-testid="level-number-badge"
      >
        {displayValue}
      </div>
    </div>
  );
}

function LevelGateSection({ level }: { level: LevelDefinition }) {
  const gateText = level.gateCriteria.replace(/\s+/g, " ").trim();

  if (!gateText) {
    return (
      <div className="mt-1.5" data-testid="levels-gate-preview">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {LEVEL_GATE_COPY.cardLabel}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-foreground sm:text-sm">
          {LEVEL_GATE_COPY.cardFallback}
        </p>
      </div>
    );
  }

  // Short gates stay fully visible; longer published checklists use disclosure
  // so the ladder stays scannable (expand current + next from Your Level Progress).
  const useDisclosure = gateText.length > 160;

  if (!useDisclosure) {
    return (
      <div
        className="mt-1.5 rounded-md border border-border-subtle bg-brand-light-gray/40 px-3 py-2"
        data-testid="levels-gate-preview"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {LEVEL_GATE_COPY.cardLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-foreground sm:text-sm">{gateText}</p>
      </div>
    );
  }

  return (
    <details
      className="mt-1.5 rounded-md border border-border-subtle bg-brand-light-gray/40 px-3 py-2"
      data-testid="levels-gate-preview"
    >
      <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex flex-wrap items-center gap-1.5">
          {LEVEL_GATE_COPY.cardLabel}
          <span className="font-semibold normal-case tracking-normal text-accent-soft">
            · expand checklist
          </span>
        </span>
      </summary>
      <p className="mt-2 text-xs leading-relaxed whitespace-pre-wrap text-foreground sm:text-sm">
        {gateText}
      </p>
    </details>
  );
}

function LevelLadderCard({
  level,
  maxXp,
  index,
  isPinnacle,
  nextLevelName,
}: {
  level: LevelDefinition;
  maxXp: number;
  index: number;
  isPinnacle: boolean;
  nextLevelName: string | null;
}) {
  const levelNumber = getLevelDisplayNumber(level);
  const tierLabel = levelNumber ? `Level ${levelNumber}` : `Step ${index + 1}`;

  return (
    <article
      className={catalogCardClass(isPinnacle ? { featured: "gold" } : undefined)}
      data-testid="levels-ladder-card"
      data-level-number={levelNumber ?? undefined}
    >
      <div className="flex items-start gap-3 px-4 py-3 sm:gap-4 sm:px-5 sm:py-4">
        <LevelNumberBadge level={level} />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {tierLabel}
            </p>
            <LevelBadge level={level.displayName} />
            {isPinnacle ? (
              <span className="rounded-md bg-court-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 ring-1 ring-court-gold/35">
                Pinnacle
              </span>
            ) : null}
          </div>
          <h3 className="text-base font-bold leading-tight text-foreground sm:text-lg">
            <Link
              href={`/levels/${level.id}`}
              className="transition hover:text-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange/40"
            >
              {level.name}
            </Link>
          </h3>
          <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
            {formatXp(level.xpRequired)} lifetime XP
            {level.xpFromPrevious > 0
              ? ` · +${formatXp(level.xpFromPrevious)} from prior level`
              : " · starting tier"}
          </p>
          <XpMeter xp={level.xpRequired} maxXp={maxXp} className="mt-0.5" />
          <LevelGateSection level={level} />
          {nextLevelName ? (
            <p className="text-xs text-muted-foreground">
              Next level: <span className="font-medium text-foreground">{nextLevelName}</span>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Top of the ladder</p>
          )}
          <p className="pt-0.5">
            <Link
              href={`/levels/${level.id}`}
              className="text-sm font-semibold text-accent-soft transition hover:underline"
            >
              Level details →
            </Link>
          </p>
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
    </article>
  );
}

function LevelsProgressGuide() {
  return (
    <section aria-labelledby="levels-progress-heading" data-testid="levels-progress">
      <div className="mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          How to use this ladder
        </p>
        <h2 id="levels-progress-heading" className="font-display mt-1 text-2xl text-foreground">
          Your Level Progress
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground">
          {LEVELS_PROGRESS_INTRO}
        </p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        {LEVELS_PROGRESS_POINTS.map((item) => (
          <div key={item.term} className={scCardPanel()}>
            <dt className="text-sm font-semibold text-foreground">{item.term}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{item.definition}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LevelsLadderView({ data }: LevelsLadderViewProps) {
  const levels = [...data.levels].sort(compareLevels);
  const firstLevel = levels[0];
  const lastLevel = levels[levels.length - 1];
  const levelRange =
    firstLevel && lastLevel
      ? `Levels ${getLevelDisplayNumber(firstLevel) ?? 1}–${getLevelDisplayNumber(lastLevel) ?? data.totalLevels}`
      : `${data.totalLevels} active levels`;

  return (
    <ProgramPage
      eyebrow="Progression path"
      title={
        <>
          Climb the <span className="text-accent-soft">level ladder</span>
        </>
      }
      description="Twelve configured tiers from first shots to G.O.A.T. — each card shows the level number, XP threshold, and gate requirements from the live program configuration."
      heroVariant="light"
      heroDecoration="ladder"
      ambientVariant="levels"
      meta={
        <span data-testid="levels-ladder-meta">
          {levelRange} · ascending order · {data.totalLevels} published
        </span>
      }
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Levels"
          caption="See the progression path from first shots to the highest tier."
          visual="basketball"
          ariaLabel={FEATURE_BANNER_ARIA.levels}
        />
        <LevelsProgressGuide />
        <div className="mx-auto max-w-4xl">
          <ol
            className="relative space-y-5"
            aria-label="Shooting Challenge levels from Level 1 through pinnacle"
            data-testid="levels-ladder-list"
          >
            <AccentRail tone="gold" className="space-y-5">
              {levels.map((level, index) => {
                const nextLevel = levels[index + 1];
                return (
                  <li key={level.id} className="relative list-none">
                    <span
                      className="absolute -left-[1.65rem] top-1/2 hidden h-3 w-3 -translate-y-1/2 rounded-full border-2 border-brand-orange/50 bg-background sm:block"
                      aria-hidden
                    />
                    <LevelLadderCard
                      level={level}
                      maxXp={data.maxXp}
                      index={index}
                      isPinnacle={index === levels.length - 1}
                      nextLevelName={nextLevel?.name ?? null}
                    />
                  </li>
                );
              })}
            </AccentRail>
          </ol>
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
      description="Twelve configured tiers from first shots to G.O.A.T. — each card shows the level number, XP threshold, and gate requirements from the live program configuration."
      heroVariant="light"
      heroDecoration="ladder"
      ambientVariant="levels"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Levels"
          caption="See the progression path from first shots to the highest tier."
          visual="basketball"
          ariaLabel={FEATURE_BANNER_ARIA.levels}
        />
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
      description="Twelve configured tiers from first shots to G.O.A.T. — each card shows the level number, XP threshold, and gate requirements from the live program configuration."
      heroVariant="light"
      heroDecoration="ladder"
      ambientVariant="levels"
    >
      <div className="space-y-8">
        <ProgramFeatureBanner
          title="Levels"
          caption="See the progression path from first shots to the highest tier."
          visual="basketball"
          ariaLabel={FEATURE_BANNER_ARIA.levels}
        />
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
