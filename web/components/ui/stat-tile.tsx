import type { ComponentType, SVGProps } from "react";

import { catalogInsetClass } from "@/components/catalog/catalog-surface";
import { cn } from "@/lib/utils";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

type StatTileProps = {
  label: string;
  value: string;
  icon?: IconComponent;
  tint?: "blue" | "orange" | "amber" | "muted";
  hint?: string;
  className?: string;
};

const TINT: Record<NonNullable<StatTileProps["tint"]>, string> = {
  blue: "text-brand-blue",
  orange: "text-accent-soft",
  amber: "text-court-gold",
  muted: "text-muted",
};

/**
 * Compact metric tile — values use mono for XP / shots / ranks.
 */
export function StatTile({
  label,
  value,
  icon: Icon,
  tint = "muted",
  hint,
  className,
}: StatTileProps) {
  return (
    <div className={cn(catalogInsetClass(), "px-4 py-3", className)}>
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className={cn("rounded-lg bg-card p-1.5 ring-1 ring-border-subtle", TINT[tint])}>
            <Icon size={16} />
          </span>
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      </div>
      <p className="mt-2 font-mono text-xl font-bold text-foreground sm:text-2xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
