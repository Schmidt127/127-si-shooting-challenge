import type { ReactNode } from "react";

import { catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 sm:py-20", className)}>
      <div className={catalogStatePanelClass(false)}>
        {icon ? (
          <div className="mx-auto inline-flex rounded-lg border border-border bg-brand-light-gray p-3.5 text-muted-foreground">
            {icon}
          </div>
        ) : (
          <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" />
        )}
        <h1
          className={cn(
            "font-display text-2xl text-foreground",
            icon ? "mt-5" : "mt-6",
          )}
        >
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
