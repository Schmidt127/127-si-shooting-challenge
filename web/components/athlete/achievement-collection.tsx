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
                {items.map((item) => (
                  <li
                    key={item.key}
                    className="relative overflow-hidden border border-border bg-card p-4"
                  >
                    <div
                      className="absolute inset-y-0 left-0 w-1 bg-brand-orange"
                      aria-hidden
                    />
                    <p className="pl-2 font-semibold text-foreground">{item.name}</p>
                    <p className="mt-1 pl-2 text-xs text-muted">
                      {[item.type, item.rarity].filter(Boolean).join(" · ") || "Achievement"}
                    </p>
                    <p className="mt-3 pl-2 text-xs text-muted">
                      {item.unlockedAt ? `Unlocked ${item.unlockedAt}` : "Unlocked"}
                      {item.xpAwarded != null ? ` · +${formatXp(item.xpAwarded)} XP` : ""}
                      {item.triggerValue != null ? ` · trigger ${item.triggerValue}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
