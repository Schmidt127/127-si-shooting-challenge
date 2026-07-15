import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageFrameProps = {
  children: ReactNode;
  className?: string;
  /** Wider content for dense boards; default is catalog-friendly. */
  width?: "default" | "wide";
};

/**
 * Shared content width + vertical rhythm for program pages inside ProductShell.
 */
export function PageFrame({ children, className, width = "default" }: PageFrameProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 pb-16 pt-8 sm:px-6 sm:pt-12",
        width === "wide" ? "max-w-6xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  align?: "left" | "center";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  align = "left",
}: PageHeaderProps) {
  return (
    <header className={cn("mb-10", align === "center" && "text-center")}>
      {eyebrow ? (
        <p
          className={cn(
            "text-[11px] font-bold uppercase tracking-[0.28em] text-brand-blue",
            align === "center" && "mx-auto",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h1
        className={cn(
          "mt-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl",
          align === "center" && "mx-auto",
        )}
      >
        {title}
      </h1>
      {description ? (
        <p
          className={cn(
            "mt-3 max-w-2xl text-base leading-relaxed text-muted",
            align === "center" && "mx-auto",
          )}
        >
          {description}
        </p>
      ) : null}
      {actions ? (
        <div className={cn("mt-5 flex flex-wrap gap-3", align === "center" && "justify-center")}>
          {actions}
        </div>
      ) : null}
    </header>
  );
}
