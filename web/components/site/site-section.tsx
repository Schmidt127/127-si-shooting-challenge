import type { ComponentProps, ReactNode } from "react";

import { SiteContainer } from "@/components/site/site-container";
import { cn } from "@/lib/utils";

type SiteSectionProps = ComponentProps<"section"> & {
  eyebrow?: string;
  title?: string;
  titleId?: string;
  description?: string;
  actions?: ReactNode;
  tone?: "default" | "muted" | "blue" | "orange";
  contain?: boolean;
};

const TONE_CLASS: Record<NonNullable<SiteSectionProps["tone"]>, string> = {
  default: "bg-transparent",
  muted: "bg-card border-y border-border",
  blue: "bg-brand-blue text-brand-white",
  orange: "bg-brand-orange text-brand-charcoal",
};

/**
 * Standard vertical section with optional eyebrow/title/description.
 * Reuse on catalog pages for consistent spacing and hierarchy.
 */
export function SiteSection({
  className,
  eyebrow,
  title,
  titleId,
  description,
  actions,
  tone = "default",
  contain = true,
  children,
  ...props
}: SiteSectionProps) {
  const content = (
    <>
      {title || eyebrow || description || actions ? (
        <div className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            {eyebrow ? (
              <p
                className={cn(
                  "text-[11px] font-bold uppercase tracking-[0.22em]",
                  tone === "blue" ? "text-brand-orange" : "text-accent-soft",
                  tone === "orange" ? "text-brand-charcoal/80" : null,
                )}
              >
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2
                id={titleId}
                className={cn(
                  "font-display mt-2 text-2xl tracking-tight sm:text-3xl",
                  tone === "blue" ? "text-brand-white" : "text-foreground",
                  tone === "orange" ? "text-brand-charcoal" : null,
                )}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                className={cn(
                  "mt-3 max-w-2xl text-base leading-relaxed",
                  tone === "blue" ? "text-contrast-muted" : "text-muted-foreground",
                  tone === "orange" ? "text-brand-charcoal/85" : null,
                )}
              >
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </>
  );

  return (
    <section
      className={cn(
        "py-10 sm:py-14",
        TONE_CLASS[tone],
        className,
      )}
      {...props}
    >
      {contain ? <SiteContainer>{content}</SiteContainer> : content}
    </section>
  );
}
