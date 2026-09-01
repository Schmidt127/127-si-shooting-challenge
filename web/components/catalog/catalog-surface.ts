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
    "overflow-hidden rounded-[var(--sc-card-radius)] border border-border bg-card text-card-foreground shadow-site-sm transition duration-200",
    "hover:-translate-y-0.5 hover:border-brand-blue/35 hover:shadow-site-md",
    "focus-within:ring-2 focus-within:ring-brand-orange/70",
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
      "overflow-hidden rounded-[var(--sc-card-radius)] sc-contrast border shadow-site-md",
    );
  }

  return cn(
    "overflow-hidden rounded-[var(--sc-card-radius)] border border-border bg-card shadow-site-sm",
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
      "rounded-[var(--sc-card-radius)] border border-[var(--sc-card-accent-border)] bg-[var(--sc-card-accent-bg)] p-[var(--sc-card-panel-padding)] shadow-site-sm sm:p-[var(--sc-card-panel-padding-md)]",
    );
  }

  if (tint === "blue") {
    return cn(
      "rounded-[var(--sc-card-radius)] border border-[var(--sc-card-blue-border)] bg-[var(--sc-card-blue-bg)] p-[var(--sc-card-panel-padding)] shadow-site-sm sm:p-[var(--sc-card-panel-padding-md)]",
    );
  }

  if (tint === "contrast") {
    return cn(
      "rounded-[var(--sc-card-radius)] border sc-contrast p-[var(--sc-card-panel-padding)] shadow-site-md sm:p-[var(--sc-card-panel-padding-md)]",
    );
  }

  return cn(
    "rounded-[var(--sc-card-radius)] border border-border bg-card p-[var(--sc-card-panel-padding)] shadow-site-sm sm:p-[var(--sc-card-panel-padding-md)]",
  );
}

/** Small inset tiles (stat blocks, download rows). */
export function catalogInsetClass(options?: { contrast?: boolean }): string {
  if (options?.contrast) {
    return cn("rounded-[var(--sc-card-radius-sm)] border sc-contrast");
  }

  return cn("rounded-[var(--sc-card-radius-sm)] border border-border-subtle bg-brand-light-gray");
}

/** Empty / error state panels. */
export function catalogStatePanelClass(error = false): string {
  return cn(
    "max-w-md rounded-[var(--sc-card-radius)] border border-border bg-card p-8 text-center shadow-site-sm",
    error ? "border-red-400/50" : "",
  );
}
