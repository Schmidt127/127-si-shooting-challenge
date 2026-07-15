import { cn } from "@/lib/utils";

/**
 * Shared catalog surface styles — 127 SI brand + Shooting Challenge theme.
 * Blue/orange dominate; court-gold sparingly; no neon glow or heavy gradients.
 */

const cardElevation =
  "shadow-[0_8px_28px_-12px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)]";

const cardElevationHover =
  "hover:shadow-[0_12px_36px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]";

const cardBorder = "border border-white/[0.12]";
const cardFill = "bg-card/90 backdrop-blur-md";

type CatalogCardOptions = {
  /** @deprecated use "gold" — amber kept as alias during redesign merge */
  featured?: "accent" | "gold" | "amber";
};

/** Clickable catalog list cards (homework, levels, tutorials). */
export function catalogCardClass(options?: CatalogCardOptions): string {
  const base = cn(
    "overflow-hidden rounded-xl transition duration-200",
    cardBorder,
    cardFill,
    cardElevation,
    cardElevationHover,
    "hover:border-white/22 hover:bg-card hover:-translate-y-0.5",
  );

  if (options?.featured === "accent") {
    return cn(
      base,
      "border-accent/40 bg-gradient-to-br from-accent/[0.12] via-card/90 to-card",
      "hover:border-accent/55",
    );
  }

  if (options?.featured === "gold" || options?.featured === "amber") {
    return cn(
      base,
      "border-court-gold/35 bg-gradient-to-br from-court-gold/[0.08] via-card/90 to-brand-blue/[0.08]",
      "hover:border-court-gold/45",
    );
  }

  return base;
}

/** Detail page hero panels and primary content blocks. */
export function catalogHeroClass(): string {
  return cn(
    "overflow-hidden rounded-xl",
    cardBorder,
    cardFill,
    "shadow-[0_10px_36px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
  );
}

type CatalogPanelOptions = {
  tint?: "neutral" | "accent" | "blue";
};

/** Secondary sections on detail pages. */
export function catalogPanelClass(options?: CatalogPanelOptions): string {
  const tint = options?.tint ?? "neutral";

  if (tint === "accent") {
    return cn(
      "rounded-xl border border-accent/25 bg-accent/[0.06] p-5 sm:p-6",
      "shadow-[0_4px_20px_-10px_rgba(0,0,0,0.65)]",
    );
  }

  if (tint === "blue") {
    return cn(
      "rounded-xl border border-brand-blue/30 bg-brand-blue/[0.08] p-5 sm:p-6",
      "shadow-[0_4px_20px_-10px_rgba(0,0,0,0.65)]",
    );
  }

  return cn(
    "rounded-xl border border-white/[0.12] bg-card/85 p-5 sm:p-6",
    "shadow-[0_4px_20px_-10px_rgba(0,0,0,0.65)]",
  );
}

/** Small inset tiles (stat blocks, download rows). */
export function catalogInsetClass(): string {
  return cn(
    "rounded-lg border border-white/[0.1] bg-white/[0.03]",
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
  );
}

/** Empty / error state panels. */
export function catalogStatePanelClass(error = false): string {
  return cn(
    "max-w-md rounded-xl p-8 text-center",
    cardBorder,
    cardFill,
    cardElevation,
    error ? "border-red-500/30" : "",
  );
}
