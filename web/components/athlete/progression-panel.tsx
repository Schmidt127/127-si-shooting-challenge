import { ProgressMeter } from "@/components/ui/progress-meter";
import { formatShots, formatXp } from "@/lib/formatters";
import type { PublicProgression } from "@/types/public-athlete-profile";

type ProgressionPanelProps = {
  progression: PublicProgression;
};

export function ProgressionPanel({ progression }: ProgressionPanelProps) {
  const xpSpan =
    progression.nextLevelXpRequired != null && progression.currentLevelXpRequired != null
      ? Math.max(1, progression.nextLevelXpRequired - progression.currentLevelXpRequired)
      : null;
  const xpPercent =
    xpSpan != null && progression.xpIntoLevel != null
      ? Math.min(100, Math.round((progression.xpIntoLevel / xpSpan) * 100))
      : progression.xpNeededForNextLevel === 0
        ? 100
        : 0;

  const xpLabel =
    progression.xpNeededForNextLevel == null
      ? "Top of ladder"
      : progression.xpNeededForNextLevel === 0
        ? "Level cleared"
        : `${formatXp(progression.xpIntoLevel ?? 0)} into level · ${formatXp(progression.xpNeededForNextLevel)} to go`;

  return (
    <section aria-labelledby="progression-heading" data-testid="progression-panel">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Path</p>
      <h2 id="progression-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Challenge progress
      </h2>

      <div className="mt-5 grid gap-5 border border-border bg-card p-5 sm:p-6 lg:grid-cols-2">
        <div>
          <p className="text-sm text-muted">
            Current{" "}
            <span className="font-semibold text-foreground">
              {progression.currentLevel ?? "Unassigned"}
            </span>
            {progression.nextLevel ? (
              <>
                {" "}
                → next{" "}
                <span className="font-semibold text-foreground">{progression.nextLevel}</span>
              </>
            ) : null}
          </p>
          <p className="mt-2 font-mono text-3xl font-black text-accent-soft">
            {formatXp(progression.lifetimeXp)}{" "}
            <span className="text-sm font-semibold uppercase tracking-widest text-muted">XP</span>
          </p>
          <div className="mt-4">
            <ProgressMeter
              label="Level XP progress"
              valueLabel={xpLabel}
              percent={xpPercent}
              tone="orange"
            />
          </div>
        </div>

        <div>
          <p className="text-sm text-muted">
            Shot goal{" "}
            <span className="font-semibold text-foreground">
              {progression.targetShotGoal == null
                ? "Not set"
                : formatShots(progression.targetShotGoal)}
            </span>
            {progression.goalMet ? (
              <span className="ml-2 text-xs font-bold uppercase tracking-wider text-brand-blue">
                Goal met
              </span>
            ) : null}
          </p>
          <div className="mt-4">
            <ProgressMeter
              label="Goal completion"
              valueLabel={
                progression.goalProgressPercent == null
                  ? "Awaiting target"
                  : `${progression.goalProgressPercent}%`
              }
              percent={progression.goalProgressPercent ?? 0}
              tone="blue"
            />
          </div>
          {progression.progressionStatus ? (
            <p className="mt-4 text-sm font-semibold text-foreground" role="status">
              Status: {progression.progressionStatus}
            </p>
          ) : null}
          {progression.gateMissingReason ? (
            <p className="mt-2 text-sm text-muted">{progression.gateMissingReason}</p>
          ) : null}
          {progression.missingRequirements.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
              {progression.missingRequirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
