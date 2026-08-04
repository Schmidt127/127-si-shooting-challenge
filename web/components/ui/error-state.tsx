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
    <div
      className={cn("flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-20", className)}
      role="alert"
    >
      <div className={catalogStatePanelClass(true)}>
        <div className="mx-auto h-0.5 w-12 rounded-full bg-brand-orange/80" aria-hidden />
        {/* h2: pages already expose a PageHero h1 via ProgramPage */}
        <h2 className="font-display mt-6 text-xl text-foreground sm:text-2xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{message}</p>
        {action ? (
          <div className="mt-6 flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap [&_a]:w-full sm:[&_a]:w-auto [&_a]:justify-center">
            {action}
          </div>
        ) : null}
      </div>
    </div>
  );
}
