import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warn" | "danger" | "accent" | "blue";

type StatusBadgeProps = {
  children: string;
  tone?: StatusBadgeTone;
  className?: string;
};

const TONE: Record<StatusBadgeTone, string> = {
  neutral: "border-white/15 bg-white/5 text-muted",
  success: "border-emerald-400/35 bg-emerald-500/10 text-emerald-100",
  warn: "border-court-gold/40 bg-court-gold/10 text-court-gold",
  danger: "border-red-400/35 bg-red-500/10 text-red-200",
  accent: "border-accent/35 bg-accent/10 text-accent-soft",
  blue: "border-brand-blue/40 bg-brand-blue/15 text-brand-white",
};

/**
 * Compact status chip — use sparingly; prefer plain text when possible.
 */
export function StatusBadge({ children, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
