import Link from "next/link";

import { LevelBadge } from "@/components/leaderboard/level-badge";
import { CtaLink, SiteSection } from "@/components/site";
import { Card, CardContent } from "@/components/ui/card";
import { getLevelStyle } from "@/lib/leaderboard/level-styles";
import { PROGRAM_LEVEL_LADDER } from "@/lib/seo/program-facts";

/**
 * Homepage anchor for the 12-level progression — Beginner through G.O.A.T.
 */
export function LevelJourneySection() {
  return (
    <SiteSection
      id="level-journey"
      tone="muted"
      eyebrow="The 12-level journey"
      title="Every athlete starts at Beginner. The goal is G.O.A.T."
      titleId="level-journey-heading"
      description="Earn XP throughout the challenge to unlock levels. Each tier marks real progress — not just shot volume, but consistent participation across the full program."
      aria-labelledby="level-journey-heading"
      actions={
        <CtaLink href="/levels" variant="default" size="default">
          View full level ladder
        </CtaLink>
      }
    >
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {PROGRAM_LEVEL_LADDER.map((levelName, index) => {
          const style = getLevelStyle(levelName);
          const isStart = index === 0;
          const isPinnacle = index === PROGRAM_LEVEL_LADDER.length - 1;

          return (
            <Card
              key={levelName}
              size="sm"
              className={`rounded-lg shadow-site-sm ${
                isPinnacle
                  ? "ring-court-gold/45 bg-gradient-to-br from-court-gold/10 via-card to-brand-orange/10"
                  : isStart
                    ? "ring-brand-blue/30"
                    : "ring-border"
              }`}
            >
              <CardContent className="flex items-center gap-3 pt-(--card-spacing)">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br font-mono text-sm font-black sm:size-11 sm:text-base ${style.gradient} ${style.text} ring-1 ${style.ring}`}
                  aria-hidden
                >
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    Level {index + 1}
                    {isStart ? " · Start" : null}
                    {isPinnacle ? " · Pinnacle" : null}
                  </p>
                  <LevelBadge level={levelName} size="sm" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        Level graphics, XP thresholds, and gate requirements are published on the{" "}
        <Link href="/levels" className="sc-text-link font-semibold text-foreground">
          levels page
        </Link>
        . Athletes track current level and XP on their dashboard throughout the challenge.
      </p>
    </SiteSection>
  );
}
