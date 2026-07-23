import Link from "next/link";

import { catalogPanelClass } from "@/components/catalog/catalog-surface";
import { MediaPanel } from "@/components/catalog/media-panel";
import { IconBook } from "@/components/icons/shoot-icons";
import { CtaLink, ProgramPage, SectionMarker } from "@/components/site";
import { EmptyState } from "@/components/ui";
import type { XpRuleCatalogData } from "@/lib/data/xp-rules";
import type { LevelLadderData } from "@/types/levels";

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
          <EmptyState
            title="Manual link not configured"
            description="Paste your Adobe-hosted manual link into NEXT_PUBLIC_GAME_MANUAL_URL and it will display here with an open button. Share the public Adobe link (from Share → Anyone can view). Typical formats: documentcloud.adobe.com or acrobat.adobe.com."
            icon={<IconBook size={40} />}
            action={
              <CtaLink href="/" variant="secondary">
                ← Back to Shooting Challenge
              </CtaLink>
            }
          />
        )}

        <XpRulesSection xpCatalog={xpCatalog} />
        <LevelLadderSection levels={levels} />
      </div>
    </ProgramPage>
  );
}
