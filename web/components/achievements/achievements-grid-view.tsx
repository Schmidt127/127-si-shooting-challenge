import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { catalogCardClass, catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { DisplayHeading } from "@/components/catalog/display-heading";
import { IconMedal } from "@/components/icons/shoot-icons";
import type { AchievementCatalogData, AchievementDefinition } from "@/types/achievements";

const RARITY_STYLES: Record<string, { ring: string; glow: string; label: string }> = {
  Common: {
    ring: "ring-slate-400/30",
    glow: "from-slate-500/10 to-slate-600/5",
    label: "text-slate-300",
  },
  Uncommon: {
    ring: "ring-cyan-400/35",
    glow: "from-cyan-500/15 to-brand-blue/10",
    label: "text-cyan-300",
  },
  Rare: {
    ring: "ring-blue-400/40",
    glow: "from-blue-500/15 to-violet-600/10",
    label: "text-blue-300",
  },
  Epic: {
    ring: "ring-violet-400/40",
    glow: "from-violet-500/20 to-fuchsia-600/10",
    label: "text-violet-300",
  },
  Legendary: {
    ring: "ring-amber-400/45",
    glow: "from-amber-500/20 to-orange-600/15",
    label: "text-amber-300",
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
        featured ? { featured: achievement.rarity === "Legendary" ? "amber" : "accent" } : undefined,
      )}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${style.glow} p-5 sm:p-6`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/30 ring-1 ${style.ring}`}
          >
            <IconMedal size={28} className={style.label} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-bold uppercase tracking-[0.22em] ${style.label}`}>
                {achievement.rarity}
              </span>
              {achievement.category ? (
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted">
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
          <h1 className="mt-4 text-2xl font-bold">Achievements coming online</h1>
          <p className="mt-3 text-sm text-muted">
            Achievement definitions will appear here once they are marked active and visible in
            Airtable.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
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
          <h1 className="text-2xl font-bold text-foreground">Could not load achievements</h1>
          <p className="mt-3 text-sm text-muted">{message}</p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm transition hover:border-accent hover:text-accent"
          >
            ← Back to overview
          </Link>
        </div>
      </div>
    </AmbientPage>
  );
}
