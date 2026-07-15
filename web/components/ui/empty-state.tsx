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
    <div className={cn("flex flex-col items-center justify-center px-6 py-20", className)}>
      <div className={catalogStatePanelClass(false)}>
        {icon ? (
          <div className="mx-auto inline-flex rounded-2xl border border-white/10 bg-white/5 p-4 text-muted">
            {icon}
          </div>
        ) : null}
        <h2 className={cn("text-2xl font-bold text-foreground", icon ? "mt-6" : undefined)}>{title}</h2>
        <p className="mt-3 text-muted">{description}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
