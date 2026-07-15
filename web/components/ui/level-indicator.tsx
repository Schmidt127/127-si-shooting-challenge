import { LevelBadge } from "@/components/leaderboard/level-badge";
import { ProgressMeter } from "@/components/ui/progress-meter";
import { formatXp } from "@/lib/formatters";
import { cn } from "@/lib/utils";

type LevelIndicatorProps = {
  level: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  nextLevelLabel?: string;
  className?: string;
};

/**
 * Level badge + XP progress toward the next rung.
 */
export function LevelIndicator({
  level,
  totalXp,
  xpIntoLevel,
  xpForNextLevel,
  nextLevelLabel,
  className,
}: LevelIndicatorProps) {
  const percent =
    xpForNextLevel > 0 ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.12] bg-card/90 p-5 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">Level</p>
          <div className="mt-2">
            <LevelBadge level={level} size="lg" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
            Lifetime XP
          </p>
          <p className="mt-1 font-mono text-2xl font-bold text-brand-orange">{formatXp(totalXp)}</p>
        </div>
      </div>

      <div className="mt-5">
        <ProgressMeter
          label={nextLevelLabel ? `Progress to ${nextLevelLabel}` : "Level progress"}
          valueLabel={`${formatXp(xpIntoLevel)} / ${formatXp(xpForNextLevel)} XP`}
          percent={percent}
          tone="orange"
        />
      </div>
    </div>
  );
}
