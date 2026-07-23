import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AccentRailProps = {
  children: ReactNode;
  className?: string;
  /** Orange instructional marker (JR Ref–style) vs blue competitive. */
  tone?: "orange" | "blue" | "gold";
};

/**
 * Vertical accent rail for instructional timelines and progression paths.
 * Keeps pages calm without repeating generic card grids.
 */
export function AccentRail({ children, className, tone = "orange" }: AccentRailProps) {
  const rail =
    tone === "blue"
      ? "from-brand-blue/55 via-brand-blue/25 to-transparent"
      : tone === "gold"
        ? "from-court-gold/55 via-brand-orange/30 to-brand-blue/20"
        : "from-brand-orange/55 via-brand-orange/25 to-transparent";

  return (
    <div className={cn("relative space-y-4 pl-0 sm:pl-8", className)}>
      <div
        className={cn(
          "absolute bottom-2 left-3 top-2 hidden w-px bg-gradient-to-b sm:block",
          rail,
        )}
        aria-hidden
      />
      {children}
    </div>
  );
}

type SectionMarkerProps = {
  label: string;
  title: string;
  countLabel?: string;
  className?: string;
};

/** Compact section header with an orange accent bar (instructional pages). */
export function SectionMarker({ label, title, countLabel, className }: SectionMarkerProps) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-4", className)}>
      <div>
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-accent-soft">
          <span className="h-0.5 w-5 rounded-full bg-brand-orange" aria-hidden />
          {label}
        </p>
        <h2 className="font-display mt-2 text-2xl tracking-tight text-foreground sm:text-3xl">
          {title}
        </h2>
      </div>
      {countLabel ? (
        <span className="rounded-md border border-border bg-card px-3 py-1 font-mono text-xs text-muted-foreground">
          {countLabel}
        </span>
      ) : null}
    </div>
  );
}
