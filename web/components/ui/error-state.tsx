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
        <div className="mx-auto h-px w-12 bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />
        <h2 className="mt-6 text-2xl font-bold text-foreground">{title}</h2>
        <p className="mt-3 text-sm text-muted">{message}</p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}
