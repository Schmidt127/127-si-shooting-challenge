import { formatShots, formatXp } from "@/lib/formatters";
import type { PublicWeeklySummary } from "@/types/public-athlete-profile";

type WeeklyPerformanceProps = {
  weeks: PublicWeeklySummary[];
};

export function WeeklyPerformance({ weeks }: WeeklyPerformanceProps) {
  return (
    <section aria-labelledby="weekly-heading" data-testid="weekly-performance">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Weeks</p>
      <h2 id="weekly-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Weekly performance
      </h2>

      {weeks.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          Weekly summaries appear after challenge weeks are closed and calculated.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {weeks.map((week) => (
            <li
              key={week.key}
              className="grid gap-3 border border-border bg-card px-4 py-4 sm:grid-cols-[1.2fr_repeat(4,minmax(0,1fr))] sm:items-center sm:px-5"
            >
              <div>
                <p className="font-semibold text-foreground">{week.weekLabel}</p>
                <p className="mt-1 text-xs text-muted">{week.momentumStatus ?? "—"}</p>
              </div>
              <p className="text-sm">
                <span className="block text-[10px] uppercase tracking-wider text-muted">Shots</span>
                <span className="font-mono font-bold">{formatShots(week.totalShots)}</span>
              </p>
              <p className="text-sm">
                <span className="block text-[10px] uppercase tracking-wider text-muted">Days</span>
                <span className="font-mono font-bold">
                  {week.daysLogged == null ? "—" : week.daysLogged}
                </span>
              </p>
              <p className="text-sm">
                <span className="block text-[10px] uppercase tracking-wider text-muted">XP</span>
                <span className="font-mono font-bold text-accent-soft">
                  {week.weeklyXp == null ? "—" : formatXp(week.weeklyXp)}
                </span>
              </p>
              <p className="text-sm">
                <span className="block text-[10px] uppercase tracking-wider text-muted">Goal</span>
                <span className="font-mono font-bold">
                  {week.goalCompletionPercent == null ? "—" : `${week.goalCompletionPercent}%`}
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
