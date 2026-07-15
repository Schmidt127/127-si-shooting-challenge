import type { ReactNode } from "react";

import { catalogCardClass } from "@/components/catalog/catalog-surface";
import { cn } from "@/lib/utils";

type InteractiveCardProps = {
  children: ReactNode;
  className?: string;
  featured?: "accent" | "amber";
  /** Prefer Link/button wrapper outside; this is the visual surface only. */
  as?: "div" | "article";
};

/**
 * Interaction surface only — use for clickable hubs, filter chips containers, and CTA blocks.
 * Do not wrap static marketing copy solely for decoration.
 */
export function InteractiveCard({
  children,
  className,
  featured,
  as: Tag = "div",
}: InteractiveCardProps) {
  return <Tag className={cn(catalogCardClass({ featured }), className)}>{children}</Tag>;
}
