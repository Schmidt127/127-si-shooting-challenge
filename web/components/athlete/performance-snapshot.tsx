import { formatShots, formatXp } from "@/lib/formatters";
import type { PublicPerformanceSummary } from "@/types/public-athlete-profile";

type PerformanceSnapshotProps = {
  performance: PublicPerformanceSummary;
};

function SecondaryStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-l border-border pl-3 sm:pl-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-bold text-foreground sm:text-xl">{value}</p>
    </div>
  );
}

export function PerformanceSnapshot({ performance }: PerformanceSnapshotProps) {
  return (
    <section aria-labelledby="performance-snapshot-heading" data-testid="performance-snapshot">
      <h2 id="performance-snapshot-heading" className="sr-only">
        Performance snapshot
      </h2>
      <div className="grid gap-6 border border-border bg-card p-5 shadow-site-sm sm:p-7 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-brand-orange">
            Primary mark
          </p>
          <p className="mt-2 font-mono text-5xl font-black tracking-tight text-brand-blue sm:text-6xl lg:text-7xl">
            {formatShots(performance.totalShots)}
          </p>
          <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em] text-muted">
            Total shots counted
          </p>
          <p className="mt-4 max-w-md text-sm text-muted">
            Lifetime XP {formatXp(performance.lifetimeXp)}
            {performance.currentLevel ? ` · ${performance.currentLevel}` : ""}
            {performance.lastSubmissionDate
              ? ` · Last session ${performance.lastSubmissionDate}`
              : ""}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-y-5">
          <SecondaryStat
            label="XP to next"
            value={
              performance.xpNeededForNextLevel == null
                ? "—"
                : formatXp(performance.xpNeededForNextLevel)
            }
          />
          <SecondaryStat label="Current streak" value={`${performance.currentStreak}d`} />
          <SecondaryStat label="Longest streak" value={`${performance.longestStreak}d`} />
          <SecondaryStat label="Submissions" value={String(performance.totalSubmissions)} />
        </div>
      </div>
    </section>
  );
}
