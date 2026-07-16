import { cn } from "@/lib/utils";

/**
 * Shared catalog surface styles — 127 SI brand + Shooting Challenge theme.
 * Primarily light cards on light-gray page chrome. Blue/orange dominate;
 * court-gold sparingly; no neon glow or heavy gradients.
 */

const cardElevation =
  "shadow-[0_8px_24px_-12px_rgba(38,38,38,0.18),0_1px_0_0_rgba(255,255,255,0.8)_inset]";

const cardElevationHover =
  "hover:shadow-[0_12px_28px_-12px_rgba(38,38,38,0.22),0_1px_0_0_rgba(255,255,255,0.9)_inset]";

const cardBorder = "border border-border";
const cardFill = "bg-card";

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
    "hover:border-brand-blue/35 hover:bg-card hover:-translate-y-0.5",
  );

  if (options?.featured === "accent") {
    return cn(
      base,
      "border-accent/40 bg-gradient-to-br from-accent/[0.1] via-card to-brand-light-gray",
      "hover:border-accent/55",
    );
  }

  if (options?.featured === "gold" || options?.featured === "amber") {
    return cn(
      base,
      "border-court-gold/40 bg-gradient-to-br from-court-gold/[0.1] via-card to-brand-blue/[0.06]",
      "hover:border-court-gold/55",
    );
  }

  return base;
}

/**
 * Detail page hero panels — optional navy contrast for branded moments.
 * Default is a light elevated card; pass contrast=true for isolated dark hero.
 */
export function catalogHeroClass(options?: { contrast?: boolean }): string {
  if (options?.contrast) {
    return cn(
      "overflow-hidden rounded-xl sc-contrast border",
      "shadow-[0_10px_32px_-12px_rgba(0,26,92,0.35)]",
    );
  }

  return cn(
    "overflow-hidden rounded-xl",
    cardBorder,
    cardFill,
    "shadow-[0_10px_28px_-12px_rgba(38,38,38,0.16)]",
  );
}

type CatalogPanelOptions = {
  tint?: "neutral" | "accent" | "blue" | "contrast";
};

/** Secondary sections on detail pages. */
export function catalogPanelClass(options?: CatalogPanelOptions): string {
  const tint = options?.tint ?? "neutral";

  if (tint === "accent") {
    return cn(
      "rounded-xl border border-accent/30 bg-accent/[0.08] p-5 sm:p-6",
      "shadow-[0_4px_16px_-10px_rgba(38,38,38,0.12)]",
    );
  }

  if (tint === "blue") {
    return cn(
      "rounded-xl border border-brand-blue/25 bg-brand-blue/[0.06] p-5 sm:p-6",
      "shadow-[0_4px_16px_-10px_rgba(38,38,38,0.12)]",
    );
  }

  if (tint === "contrast") {
    return cn(
      "rounded-xl border sc-contrast p-5 sm:p-6",
      "shadow-[0_4px_20px_-10px_rgba(0,26,92,0.3)]",
    );
  }

  return cn(
    "rounded-xl border border-border bg-card p-5 sm:p-6",
    "shadow-[0_4px_16px_-10px_rgba(38,38,38,0.12)]",
  );
}

/** Small inset tiles (stat blocks, download rows). */
export function catalogInsetClass(options?: { contrast?: boolean }): string {
  if (options?.contrast) {
    return cn(
      "rounded-lg border sc-contrast",
      "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]",
    );
  }

  return cn(
    "rounded-lg border border-border-subtle bg-brand-light-gray",
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)]",
  );
}

/** Empty / error state panels. */
export function catalogStatePanelClass(error = false): string {
  return cn(
    "max-w-md rounded-xl p-8 text-center",
    cardBorder,
    cardFill,
    cardElevation,
    error ? "border-red-400/50" : "",
  );
}
