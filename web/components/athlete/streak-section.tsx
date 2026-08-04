import type { PublicAchievement, PublicStreaks } from "@/types/public-athlete-profile";

type StreakSectionProps = {
  streaks: PublicStreaks;
  streakAchievements: PublicAchievement[];
};

export function StreakSection({ streaks, streakAchievements }: StreakSectionProps) {
  return (
    <section aria-labelledby="streak-heading" data-testid="streak-section">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
        Consistency
      </p>
      <h2 id="streak-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Streaks
      </h2>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Current
          </p>
          <p className="mt-2 font-mono text-4xl font-black text-brand-orange">
            {streaks.current}
            <span className="ml-1 text-base font-semibold text-muted">days</span>
          </p>
          {streaks.status ? (
            <p className="mt-2 text-sm text-muted" role="status">
              {streaks.status}
              {streaks.asOfDate ? ` · as of ${streaks.asOfDate}` : ""}
            </p>
          ) : null}
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Longest
          </p>
          <p className="mt-2 font-mono text-4xl font-black text-brand-blue">
            {streaks.longest}
            <span className="ml-1 text-base font-semibold text-muted">days</span>
          </p>
        </div>
        <div className="border border-border bg-card p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            Streak awards
          </p>
          {streakAchievements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Keep logging — streak badges unlock here.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {streakAchievements.slice(0, 4).map((item) => (
                <li key={item.key} className="text-sm font-semibold text-foreground">
                  {item.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
