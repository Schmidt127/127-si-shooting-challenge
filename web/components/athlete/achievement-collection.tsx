import { resolveBadgeIcon } from "@/lib/achievements/resolve-badge-icon";
import { formatXp } from "@/lib/formatters";
import type {
  PublicAchievement,
  PublicAchievementGroup,
} from "@/types/public-athlete-profile";

type AchievementCollectionProps = {
  achievements: PublicAchievement[];
};

const GROUP_ORDER: PublicAchievementGroup[] = [
  "Streaks",
  "Shot Milestones",
  "Perfect Week",
  "Challenge Accomplishments",
  "Other",
];

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

function rarityStyle(rarity: string | null) {
  if (!rarity) return RARITY_STYLES.Common;
  return RARITY_STYLES[rarity] ?? RARITY_STYLES.Common;
}

export function AchievementCollection({ achievements }: AchievementCollectionProps) {
  const grouped = GROUP_ORDER.map((group) => ({
    group,
    items: achievements.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <section aria-labelledby="achievements-heading" data-testid="achievement-collection">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
        Hardware
      </p>
      <h2 id="achievements-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Achievements & milestones
      </h2>

      {achievements.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          No public achievements unlocked yet. Streaks, Perfect Weeks, and shot milestones will
          show here when earned.
        </p>
      ) : (
        <div className="mt-5 space-y-8">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <h3 className="text-sm font-bold uppercase tracking-[0.16em] text-muted">{group}</h3>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => {
                  const style = rarityStyle(item.rarity);
                  const Icon = resolveBadgeIcon(item.badgeIconName);

                  return (
                    <li
                      key={item.key}
                      className="relative overflow-hidden border border-border bg-card p-4"
                      data-testid="achievement-card"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-light-gray ring-1 ${style.ring}`}
                          data-testid="achievement-icon"
                        >
                          <Icon size={22} className={style.label} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {item.rarity ? (
                              <span
                                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${style.chip} ${style.label}`}
                              >
                                {item.rarity}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 font-semibold text-foreground">{item.name}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {[item.type, item.category].filter(Boolean).join(" · ") || "Achievement"}
                          </p>
                          <p className="mt-2 text-xs text-muted">
                            {item.unlockedAt ? `Unlocked ${item.unlockedAt}` : "Unlocked"}
                            {item.xpAwarded != null ? ` · +${formatXp(item.xpAwarded)} XP` : ""}
                            {item.triggerValue != null ? ` · trigger ${item.triggerValue}` : ""}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
