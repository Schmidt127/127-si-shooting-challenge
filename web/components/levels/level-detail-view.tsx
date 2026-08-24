import {
  catalogHeroClass,
  catalogInsetClass,
  catalogPanelClass,
} from "@/components/catalog/catalog-surface";
import { DetailTitle, SectionHeading } from "@/components/catalog/display-heading";
import { RichContent } from "@/components/catalog/rich-content";
import { LevelCoverImage } from "@/components/levels/level-cover-image";
import { CtaLink, DetailPageShell } from "@/components/site";
import { EmptyState } from "@/components/ui";
import { formatXp } from "@/lib/formatters";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import { getLevelCoverAssetPath } from "@/lib/levels/level-cover-assets";
import { cn } from "@/lib/utils";
import type { LevelDefinition } from "@/types/levels";

import { LevelBadge } from "../leaderboard/level-badge";

type LevelDetailViewProps = {
  level: LevelDefinition;
};

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(catalogInsetClass(), "rounded-xl px-4 py-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="mt-1 font-mono text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export function LevelDetailView({ level }: LevelDetailViewProps) {
  const style = getLevelStyle(level.displayName);
  const coverAssetPath = getLevelCoverAssetPath(level.name, level.sortOrder);

  return (
    <DetailPageShell
      backHref="/levels"
      backLabel="Level ladder"
      ambientVariant="levels"
    >
      <div className={cn(catalogHeroClass(), "relative")}>
        {coverAssetPath ? (
          <div className="flex w-full items-center justify-center bg-brand-light-gray px-4 py-6 sm:px-8 sm:py-8">
            <LevelCoverImage
              levelName={level.name}
              displayName={level.displayName}
              sortOrder={level.sortOrder}
              size="hero"
              priority
            />
          </div>
        ) : (
          <div className={`h-24 bg-gradient-to-br ${style.gradient}`} />
        )}

        <div className="relative p-6 sm:p-10">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div
                className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-mono text-2xl font-black ${style.gradient} ${style.text} ring-1 ${style.ring}`}
              >
                {level.sortOrder || level.rank || "★"}
              </div>
              <DetailTitle
                overline={level.rank > 0 ? `Tier ${level.rank}` : "Challenge level"}
                title={level.name}
                accent={level.displayName !== level.name ? level.displayName : undefined}
              />
            </div>
            <LevelBadge level={level.displayName} size="lg" />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatPill label="Lifetime XP" value={formatXp(level.xpRequired)} />
            <StatPill
              label="XP to unlock"
              value={level.xpFromPrevious > 0 ? formatXp(level.xpFromPrevious) : "Starting tier"}
            />
            <StatPill label="Ladder step" value={String(level.sortOrder || "—")} />
          </div>
        </div>
      </div>

      <section className={cn(catalogPanelClass({ tint: "blue" }), "mt-10")}>
        <SectionHeading
          label="Gate checklist"
          title="What it takes to advance"
          description="Requirements pulled live from your level gate rules."
        />
        {level.gateCriteria ? (
          <RichContent text={level.gateCriteria} className="text-foreground/90" />
        ) : (
          <p className="mt-4 text-sm text-muted" role="status">
            Public gate criteria are not published for this level yet. XP thresholds above still
            apply; Zoom and Perfect Week gates appear when configured in Airtable.
          </p>
        )}
      </section>

      <nav className="mt-10 flex flex-wrap gap-3">
        {level.previousLevelId ? (
          <CtaLink href={`/levels/${level.previousLevelId}`} variant="secondary">
            ← Previous tier
          </CtaLink>
        ) : null}
        {level.nextLevelId ? (
          <CtaLink href={`/levels/${level.nextLevelId}`} variant="secondary">
            Next tier →
          </CtaLink>
        ) : null}
      </nav>
    </DetailPageShell>
  );
}

export function LevelNotFoundState() {
  return (
    <DetailPageShell
      backHref="/levels"
      backLabel="Level ladder"
      ambientVariant="levels"
    >
      <EmptyState
        title="Level not found"
        description="This tier may be inactive or the link is incorrect."
        titleAs="h1"
        action={
          <CtaLink href="/levels" variant="secondary">
            ← Back to levels
          </CtaLink>
        }
      />
    </DetailPageShell>
  );
}
