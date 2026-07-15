import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warn" | "danger" | "accent" | "blue";

type StatusBadgeProps = {
  children: string;
  tone?: StatusBadgeTone;
  className?: string;
};

const TONE: Record<StatusBadgeTone, string> = {
  neutral: "border-white/15 bg-white/5 text-muted",
  success: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
  warn: "border-amber-400/30 bg-amber-500/10 text-amber-200",
  danger: "border-red-400/30 bg-red-500/10 text-red-200",
  accent: "border-accent/30 bg-accent/10 text-accent-soft",
  blue: "border-brand-blue/35 bg-brand-blue/10 text-sky-200",
};

export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
