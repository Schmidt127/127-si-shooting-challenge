import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogCardClass, catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { IconMedal } from "@/components/icons/shoot-icons";
import { EMPTY_STATE_COPY } from "@/lib/release/public-surface";
import type { AchievementCatalogData, AchievementDefinition } from "@/types/achievements";

const RARITY_STYLES: Record<string, { ring: string; chip: string; label: string }> = {
  Common: {
    ring: "ring-border",
    chip: "border-border bg-brand-light-gray",
    label: "text-muted",
  },
  Uncommon: {
    ring: "ring-brand-blue/35",
    chip: "border-brand-blue/30 bg-brand-blue/10",
    label: "text-brand-blue",
  },
  Rare: {
    ring: "ring-brand-blue/45",
    chip: "border-brand-blue/35 bg-brand-blue/15",
    label: "text-brand-blue",
  },
  Epic: {
    ring: "ring-brand-orange/40",
    chip: "border-brand-orange/30 bg-brand-orange/10",
    label: "text-accent-soft",
  },
  Legendary: {
    ring: "ring-court-gold/45",
    chip: "border-court-gold/35 bg-court-gold/10",
    label: "text-amber-900",
  },
};

function rarityStyle(rarity: string) {
  return RARITY_STYLES[rarity] ?? RARITY_STYLES.Common;
}

function AchievementCard({ achievement }: { achievement: AchievementDefinition }) {
  const style = rarityStyle(achievement.rarity);
  const featured = achievement.rarity === "Epic" || achievement.rarity === "Legendary";

  return (
    <article
      className={catalogCardClass(
        featured ? { featured: achievement.rarity === "Legendary" ? "gold" : "accent" } : undefined,
      )}
    >
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-light-gray ring-1 ${style.ring}`}
          >
            <IconMedal size={24} className={style.label} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${style.chip} ${style.label}`}
              >
                {achievement.rarity}
              </span>
              {achievement.category ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  {achievement.category}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 text-lg font-bold text-foreground">{achievement.name}</h3>
            {achievement.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted">{achievement.description}</p>
            ) : null}
            {achievement.triggerType ? (
              <p className="mt-3 font-mono text-xs text-muted-subtle">
                Unlock: {achievement.triggerType}
                {achievement.triggerThreshold != null && achievement.triggerThreshold > 0
                  ? ` ${achievement.triggerThreshold}+`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

type AchievementsGridViewProps = {
  data: AchievementCatalogData;
};

export function AchievementsGridView({ data }: AchievementsGridViewProps) {
  const grouped = data.achievements.reduce<Record<string, AchievementDefinition[]>>((acc, item) => {
    const key = item.category || item.type || "Achievements";
    acc[key] = acc[key] ? [...acc[key], item] : [item];
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  return (
    <AmbientPage variant="achievements">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <DisplayHeading
          eyebrow="Earn your badges"
          title="Achievements"
          subtitle="Milestones, streaks, perfect weeks, and secret unlocks — definitions from the live challenge rulebook."
          icon={<IconMedal size={32} />}
        />

        <div className="mt-10 space-y-12">
          {groups.map(([groupName, items]) => (
            <section key={groupName}>
              <h2 className="text-sm font-bold uppercase tracking-[0.24em] text-brand-blue">
                {groupName}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {items.map((achievement) => (
                  <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </AmbientPage>
  );
}

export function AchievementsEmptyState() {
  return (
    <AmbientPage variant="achievements">
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className={catalogStatePanelClass()}>
          <IconMedal size={40} className="mx-auto text-muted" />
          <h1 className="font-display mt-4 text-2xl">{EMPTY_STATE_COPY.achievements.title}</h1>
          <p className="mt-3 text-sm text-muted">{EMPTY_STATE_COPY.achievements.description}</p>
          <Link href="/" className="btn-secondary mt-6">
            ← Back to overview
          </Link>
        </div>
      </div>
    </AmbientPage>
  );
}

export function AchievementsErrorState({ message }: { message: string }) {
  return (
    <AmbientPage variant="achievements">
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className={catalogStatePanelClass()}>
          <h1 className="font-display text-2xl text-foreground">Could not load achievements</h1>
          <p className="mt-3 text-sm text-muted">{message}</p>
          <Link href="/" className="btn-secondary mt-6">
            ← Back to overview
          </Link>
        </div>
      </div>
    </AmbientPage>
  );
}
