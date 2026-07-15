import { cn } from "@/lib/utils";

type ProgressMeterProps = {
  label: string;
  valueLabel: string;
  /** 0–100 */
  percent: number;
  tone?: "orange" | "blue" | "amber";
  className?: string;
};

const BAR: Record<NonNullable<ProgressMeterProps["tone"]>, string> = {
  orange: "bg-brand-orange",
  blue: "bg-brand-blue",
  amber: "bg-amber-400",
};

export function ProgressMeter({
  label,
  valueLabel,
  percent,
  tone = "orange",
  className,
}: ProgressMeterProps) {
  const clamped = Math.max(0, Math.min(100, percent));

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-2 flex items-end justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
        <p className="font-mono text-xs font-semibold text-foreground">{valueLabel}</p>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", BAR[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
