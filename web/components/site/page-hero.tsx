import type { ReactNode } from "react";

import { SiteContainer } from "@/components/site/site-container";
import { cn } from "@/lib/utils";

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  /** `contrast` = blue performance band; `light` = white/light surface. */
  variant?: "contrast" | "light";
  className?: string;
};

/**
 * Shared page hero for landing and inner catalog pages.
 * Aside sits beside copy on desktop and below copy on mobile.
 */
export function PageHero({
  eyebrow,
  title,
  description,
  actions,
  aside,
  variant = "contrast",
  className,
}: PageHeroProps) {
  const contrast = variant === "contrast";

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b",
        contrast
          ? "border-contrast-border bg-brand-blue text-brand-white"
          : "border-border bg-card text-foreground",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className={cn(
            "absolute inset-0 court-lines",
            contrast ? "opacity-30" : "opacity-40",
          )}
        />
        <div
          className={cn(
            "absolute inset-x-0 bottom-0 h-40 shot-arc",
            contrast ? "opacity-80" : "opacity-60",
          )}
        />
        {contrast ? (
          <>
            <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-brand-orange/20 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-court-navy/50 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue via-brand-blue to-court-navy" />
          </>
        ) : (
          <>
            <div className="absolute -left-16 top-0 h-56 w-56 rounded-full bg-brand-blue/10 blur-3xl" />
            <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-brand-orange/10 blur-3xl" />
          </>
        )}
      </div>

      <SiteContainer className="relative py-9 sm:py-12 lg:py-14">
        <div
          className={cn(
            "grid items-center gap-7",
            aside ? "lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10" : null,
          )}
        >
          <div className="max-w-3xl">
            {eyebrow ? (
              <p
                className={cn(
                  "motion-fade text-[11px] font-bold uppercase tracking-[0.24em]",
                  contrast ? "text-brand-orange" : "text-accent-soft",
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            <h1
              className={cn(
                "font-display motion-rise mt-3 text-3xl leading-[1.08] tracking-tight sm:text-4xl lg:text-[2.75rem]",
                contrast ? "text-brand-white" : "text-foreground",
              )}
            >
              {title}
            </h1>
            {description ? (
              <div
                className={cn(
                  "motion-rise motion-delay-1 mt-4 max-w-2xl text-base leading-relaxed sm:text-[1.05rem]",
                  contrast ? "text-contrast-muted" : "text-muted-foreground",
                )}
              >
                {description}
              </div>
            ) : null}
            {actions ? (
              <div className="motion-rise motion-delay-2 mt-6 flex flex-wrap gap-2.5">
                {actions}
              </div>
            ) : null}
          </div>
          {aside ? (
            <div className="motion-rise motion-delay-3 min-w-0 lg:justify-self-end">
              {aside}
            </div>
          ) : null}
        </div>
      </SiteContainer>
    </section>
  );
}
