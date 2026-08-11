import Link from "next/link";

import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { MediaPanel } from "@/components/catalog/media-panel";
import { IconBook } from "@/components/icons/shoot-icons";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import { EmptyState } from "@/components/ui";
import type { XpRuleCatalogData } from "@/lib/data/xp-rules";
import type { LevelLadderData } from "@/types/levels";
import {
  GAME_MANUAL_QUICK_START,
  GAME_MANUAL_QUICK_START_TITLE,
} from "./game-manual-quick-start";

type GameManualViewProps = {
  manualUrl: string | null;
  /** Live XP Reward Rules configuration; null when Airtable is unavailable. */
  xpCatalog: XpRuleCatalogData | null;
  /** Live level ladder configuration; null when Airtable is unavailable. */
  levels: LevelLadderData | null;
};

function formatXp(amount: number): string {
  return `${amount.toLocaleString("en-US")} XP`;
}

function XpRulesSection({ xpCatalog }: { xpCatalog: XpRuleCatalogData | null }) {
  return (
    <div className="mt-12">
      <SectionMarker label="Live configuration" title="How you earn XP" />
      {xpCatalog && xpCatalog.groups.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2" role="list" aria-label="XP reward categories">
          {xpCatalog.groups.map((group) => (
            <section
              key={group.id}
              role="listitem"
              className={catalogPanelClass({ tint: "neutral" })}
              aria-labelledby={`xp-group-${group.id}`}
            >
              <h3 id={`xp-group-${group.id}`} className="text-base font-semibold text-foreground">
                {group.title}
              </h3>
              <p className="mt-1 text-sm text-muted">{group.description}</p>
              <ul className="mt-3 space-y-1.5">
                {group.rules.map((rule) => (
                  <li
                    key={rule.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="text-foreground">{rule.label}</span>
                    <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                      {formatXp(rule.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="XP rules coming online"
          description="Configured XP reward rules will appear here when available. Amounts always come from the live program configuration."
        />
      )}
      <p className="mt-4 text-xs text-muted">
        XP amounts shown are read live from the program configuration and may be tuned during the
        season.
      </p>
    </div>
  );
}

function LevelLadderSection({ levels }: { levels: LevelLadderData | null }) {
  /** Ladder arrives highest-first; the manual reads better lowest-first. */
  const ascending = levels ? [...levels.levels].reverse() : [];

  return (
    <div className="mt-12">
      <SectionMarker label="Live configuration" title="Level ladder" />
      {ascending.length > 0 ? (
        <section
          className={catalogPanelClass({ tint: "neutral" })}
          aria-labelledby="game-manual-level-ladder"
        >
          <h3 id="game-manual-level-ladder" className="sr-only">
            Level ladder
          </h3>
          <ol className="space-y-1.5" aria-label="Levels from first to highest">
            {ascending.map((level, index) => (
              <li
                key={level.id}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-foreground">
                  <span className="mr-2 font-mono text-xs text-muted">{index + 1}.</span>
                  {level.displayName}
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold text-foreground">
                  {level.xpRequired.toLocaleString("en-US")} XP
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted">
            Some levels also have gate requirements beyond XP — see the{" "}
            <Link href="/levels" className="font-medium text-brand-blue underline underline-offset-2">
              levels catalog
            </Link>{" "}
            for details.
          </p>
        </section>
      ) : (
        <EmptyState
          title="Levels coming soon"
          description="The configured level ladder will appear here when published levels are available."
        />
      )}
    </div>
  );
}

function QuickStartSection() {
  return (
    <section className="mt-12" aria-labelledby="game-manual-quick-start">
        <SectionMarker label="Quick start" title={GAME_MANUAL_QUICK_START_TITLE} />
      <div
        className="grid gap-4 md:grid-cols-3"
        role="list"
        aria-label="Shooting Challenge quick start steps"
      >
        {GAME_MANUAL_QUICK_START.map((step, index) => (
          <article
            key={step.title}
            role="listitem"
            className={catalogPanelClass({ tint: index === 0 ? "blue" : "neutral" })}
          >
            <p className="font-mono text-xs font-semibold text-brand-blue">0{index + 1}</p>
            <h3 className="mt-3 text-base font-semibold text-foreground">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function GameManualView({ manualUrl, xpCatalog, levels }: GameManualViewProps) {
  return (
    <ProgramPage
      eyebrow="Official reference"
      title="Game manual"
      description="Rules, scoring, XP, and how the Shooting Challenge works."
      heroVariant="light"
      ambientVariant="default"
    >
      <div className="mx-auto max-w-6xl">
        {manualUrl ? (
          <MediaPanel
            url={manualUrl}
            title="Shooting Challenge Game Manual"
            openLabel="Open game manual"
            externalHint="The manual is hosted on Adobe. Open it in a new tab — Adobe blocks embedding on other sites, which causes the Bad Gateway error in iframes."
          />
        ) : (
          <section
            className="rounded-lg border border-border bg-card p-5 sm:p-6"
            aria-labelledby="game-manual-link-status"
          >
            <div className="flex items-start gap-4">
              <IconBook size={32} className="mt-0.5 shrink-0 text-brand-blue" />
              <div>
                <h2 id="game-manual-link-status" className="text-lg font-semibold text-foreground">
                  Official manual link coming soon
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  The configured PDF link is not available yet. The live XP rules and level ladder
                  below are still ready to help you understand the program.
                </p>
                <CtaLink href="/" variant="link" className="mt-3 px-0">
                  ← Back to Shooting Challenge
                </CtaLink>
              </div>
            </div>
          </section>
        )}

        <QuickStartSection />
        <XpRulesSection xpCatalog={xpCatalog} />
        <LevelLadderSection levels={levels} />
      </div>
    </ProgramPage>
  );
}
