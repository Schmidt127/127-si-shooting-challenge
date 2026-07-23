import { cn } from "@/lib/utils";

/**
 * Shared catalog surface styles — restrained elevation aligned with the
 * approved home design system (shadow-site-sm, moderate radius).
 */

type CatalogCardOptions = {
  /** @deprecated use "gold" — amber kept as alias during redesign merge */
  featured?: "accent" | "gold" | "amber";
};

/** Clickable catalog list cards (homework, levels, tutorials). */
export function catalogCardClass(options?: CatalogCardOptions): string {
  const base = cn(
    "overflow-hidden rounded-lg border border-border bg-card shadow-site-sm transition duration-200",
    "hover:-translate-y-0.5 hover:border-brand-blue/35 hover:shadow-site-md",
  );

  if (options?.featured === "accent") {
    return cn(
      base,
      "border-brand-orange/35 bg-gradient-to-br from-brand-orange/[0.08] via-card to-card",
      "hover:border-brand-orange/50",
    );
  }

  if (options?.featured === "gold" || options?.featured === "amber") {
    return cn(
      base,
      "border-court-gold/40 bg-gradient-to-br from-court-gold/[0.1] via-card to-brand-blue/[0.05]",
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
      "overflow-hidden rounded-lg sc-contrast border shadow-site-md",
    );
  }

  return cn(
    "overflow-hidden rounded-lg border border-border bg-card shadow-site-sm",
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
      "rounded-lg border border-brand-orange/30 bg-brand-orange/[0.07] p-5 shadow-site-sm sm:p-6",
    );
  }

  if (tint === "blue") {
    return cn(
      "rounded-lg border border-brand-blue/25 bg-brand-blue/[0.05] p-5 shadow-site-sm sm:p-6",
    );
  }

  if (tint === "contrast") {
    return cn(
      "rounded-lg border sc-contrast p-5 shadow-site-md sm:p-6",
    );
  }

  return cn(
    "rounded-lg border border-border bg-card p-5 shadow-site-sm sm:p-6",
  );
}

/** Small inset tiles (stat blocks, download rows). */
export function catalogInsetClass(options?: { contrast?: boolean }): string {
  if (options?.contrast) {
    return cn("rounded-md border sc-contrast");
  }

  return cn("rounded-md border border-border-subtle bg-brand-light-gray");
}

/** Empty / error state panels. */
export function catalogStatePanelClass(error = false): string {
  return cn(
    "max-w-md rounded-lg border border-border bg-card p-8 text-center shadow-site-sm",
    error ? "border-red-400/50" : "",
  );
}
