import { getLevelStyle } from "@/lib/leaderboard/level-styles";

type LevelBadgeProps = {
  level: string;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function LevelBadge({ level, size = "md" }: LevelBadgeProps) {
  const style = getLevelStyle(level);

  return (
    <span
      className={`inline-flex items-center rounded-full bg-gradient-to-r font-semibold uppercase tracking-wide ring-1 ${style.gradient} ${style.text} ${style.ring} ${style.glow} ${sizeClasses[size]}`}
    >
      {style.label}
    </span>
  );
}
