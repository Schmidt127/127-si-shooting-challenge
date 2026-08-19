import type { ReactNode } from "react";

import { catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  /**
   * Catalog empty states under ProgramPage already have a PageHero h1 → use h2.
   * Detail not-found shells (DetailPageShell) have no page title → use h1.
   */
  titleAs?: "h1" | "h2";
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  titleAs = "h2",
}: EmptyStateProps) {
  const TitleTag = titleAs;
  return (
    <div
      className={cn("flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20", className)}
      role="status"
      aria-live="polite"
    >
      <div className={catalogStatePanelClass(false)}>
        {icon ? (
          <div
            className="mx-auto inline-flex rounded-lg border border-border bg-brand-light-gray p-3.5 text-muted-foreground"
            aria-hidden
          >
            {icon}
          </div>
        ) : (
          <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" aria-hidden />
        )}
        <TitleTag
          className={cn(
            "font-display text-xl text-foreground sm:text-2xl",
            icon ? "mt-5" : "mt-6",
          )}
        >
          {title}
        </TitleTag>
        <p className="mt-3 text-sm leading-relaxed text-foreground">{description}</p>
        {action ? (
          <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&_a]:w-full sm:[&_a]:w-auto [&_a]:justify-center">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
