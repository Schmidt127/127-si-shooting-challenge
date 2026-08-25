import { getLevelStyle } from "@/lib/leaderboard/level-styles";

type LevelBadgeProps = {
  level: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "hero";
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
  lg: "px-3 py-1.5 text-sm",
};

export function LevelBadge({ level, size = "md", variant = "default" }: LevelBadgeProps) {
  const style = getLevelStyle(level);

  if (variant === "hero") {
    return (
      <span
        className={`inline-flex items-center rounded-md bg-white/12 font-semibold uppercase tracking-wide text-white ring-1 ring-white/30 backdrop-blur-sm ${sizeClasses[size]}`}
        data-testid="level-badge-hero"
      >
        {style.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-md bg-gradient-to-r font-semibold uppercase tracking-wide ring-1 ${style.gradient} ${style.text} ${style.ring} ${sizeClasses[size]}`}
    >
      {style.label}
    </span>
  );
}
