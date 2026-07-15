import { cn } from "@/lib/utils";

/** Base lift + top-edge highlight for cards on dark ambient pages. */
const cardElevation =
  "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.75),inset_0_1px_0_0_rgba(255,255,255,0.07)]";

const cardElevationHover =
  "hover:shadow-[0_16px_48px_-10px_rgba(0,0,0,0.85),inset_0_1px_0_0_rgba(255,255,255,0.1)]";

const cardBorder = "border border-white/[0.14]";
const cardFill = "bg-card/85 backdrop-blur-md";

type CatalogCardOptions = {
  featured?: "accent" | "amber";
};

/** Clickable catalog list cards (homework, levels, tutorials). */
export function catalogCardClass(options?: CatalogCardOptions): string {
  const base = cn(
    "overflow-hidden rounded-2xl transition duration-300",
    cardBorder,
    cardFill,
    cardElevation,
    cardElevationHover,
    "hover:border-white/25 hover:bg-card/95 hover:-translate-y-0.5",
  );

  if (options?.featured === "accent") {
    return cn(
      base,
      "border-accent/35 bg-gradient-to-br from-accent/10 via-card/85 to-card/70",
      "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.75),0_0_36px_-12px_rgba(255,139,0,0.32),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      "hover:border-accent/45",
    );
  }

  if (options?.featured === "amber") {
    return cn(
      base,
      "border-amber-400/35 bg-gradient-to-br from-amber-500/10 via-card/85 to-brand-blue/15",
      "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.75),0_0_44px_-12px_rgba(251,191,36,0.35),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
      "hover:border-amber-400/45",
    );
  }

  return base;
}

/** Detail page hero panels and primary content blocks. */
export function catalogHeroClass(): string {
  return cn(
    "overflow-hidden rounded-3xl",
    cardBorder,
    cardFill,
    "shadow-[0_12px_48px_-12px_rgba(0,0,0,0.8),inset_0_1px_0_0_rgba(255,255,255,0.08)]",
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
      "rounded-2xl border border-accent/20 bg-accent/[0.07] p-6 backdrop-blur-md sm:p-8",
      "shadow-[0_6px_28px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
    );
  }

  if (tint === "blue") {
    return cn(
      "rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.07] p-6 backdrop-blur-md sm:p-8",
      "shadow-[0_6px_28px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
    );
  }

  return cn(
    "rounded-2xl border border-white/[0.14] bg-card/80 p-6 backdrop-blur-md sm:p-8",
    "shadow-[0_6px_28px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.06)]",
  );
}

/** Small inset tiles (stat pills, download rows, topic chips on panels). */
export function catalogInsetClass(): string {
  return cn(
    "rounded-xl border border-white/[0.12] bg-white/[0.04] backdrop-blur-sm",
    "shadow-[0_4px_16px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_0_rgba(255,255,255,0.05)]",
  );
}

/** Empty / error state panels. */
export function catalogStatePanelClass(error = false): string {
  return cn(
    "max-w-md rounded-2xl p-8 text-center backdrop-blur-xl",
    cardBorder,
    cardFill,
    cardElevation,
    error ? "border-red-500/25" : "",
  );
}
