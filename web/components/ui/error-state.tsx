import type { ReactNode } from "react";

import { catalogStatePanelClass } from "@/components/catalog/catalog-surface";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
};

export function ErrorState({ title, message, action, className }: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-20", className)}>
      <div className={catalogStatePanelClass(true)}>
        <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" />
        <h2 className="font-display mt-6 text-2xl text-foreground">{title}</h2>
        <p className="mt-3 text-sm text-muted">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
