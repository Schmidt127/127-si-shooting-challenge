import { cn } from "@/lib/utils";

export type StatusBadgeTone = "neutral" | "success" | "warn" | "danger" | "accent" | "blue";

type StatusBadgeProps = {
  children: string;
  tone?: StatusBadgeTone;
  className?: string;
};

const TONE: Record<StatusBadgeTone, string> = {
  neutral: "border-border bg-brand-light-gray text-muted",
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  warn: "border-court-gold/50 bg-court-gold/15 text-amber-900",
  danger: "border-red-300 bg-red-50 text-red-800",
  accent: "border-accent/40 bg-accent/10 text-accent-soft",
  blue: "border-brand-blue/35 bg-brand-blue/10 text-brand-blue",
};

/**
 * Compact status chip — use sparingly; prefer plain text when possible.
 * Tone is paired with text so status is never color-only.
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
