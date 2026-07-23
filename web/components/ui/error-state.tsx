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
    <div className={cn("flex flex-col items-center justify-center px-6 py-16 sm:py-20", className)}>
      <div className={catalogStatePanelClass(true)}>
        <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" />
        <h1 className="font-display mt-6 text-2xl text-foreground">{title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
        {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
      </div>
    </div>
  );
}
