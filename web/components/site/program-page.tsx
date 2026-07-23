import type { ReactNode } from "react";
import Link from "next/link";

import { AmbientPage, type AmbientPageProps } from "@/components/catalog/ambient-page";
import { PageHero } from "@/components/site/page-hero";
import { SiteContainer } from "@/components/site/site-container";
import { SiteSection } from "@/components/site/site-section";
import { cn } from "@/lib/utils";

type ProgramPageProps = {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  /** Competitive pages use contrast; instructional pages use light. */
  heroVariant?: "contrast" | "light";
  ambientVariant?: AmbientPageProps["variant"];
  /** Optional meta line under the hero (counts, updated timestamps). */
  meta?: ReactNode;
  /** When false, children render full-bleed (caller supplies SiteSection/containers). */
  contain?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Shared inner-page shell: PageHero + ambient glows + content rhythm.
 * Matches the approved home page design system without forcing identical layouts.
 */
export function ProgramPage({
  eyebrow,
  title,
  description,
  actions,
  aside,
  heroVariant = "contrast",
  ambientVariant = "default",
  meta,
  contain = true,
  className,
  children,
}: ProgramPageProps) {
  return (
    <AmbientPage variant={ambientVariant}>
      <PageHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        aside={aside}
        variant={heroVariant}
      />
      {meta ? (
        <div className="border-b border-border bg-card/70">
          <SiteContainer className="py-3 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {meta}
          </SiteContainer>
        </div>
      ) : null}
      {contain ? (
        <SiteSection className={cn("pb-16 pt-8 sm:pb-20 sm:pt-10", className)} contain>
          {children}
        </SiteSection>
      ) : (
        <div className={cn(className)}>{children}</div>
      )}
    </AmbientPage>
  );
}

type DetailPageShellProps = {
  backHref: string;
  backLabel: string;
  children: ReactNode;
  className?: string;
  ambientVariant?: AmbientPageProps["variant"];
};

/**
 * Calm detail-page chrome with a clear back link and contained width.
 */
export function DetailPageShell({
  backHref,
  backLabel,
  children,
  className,
  ambientVariant = "default",
}: DetailPageShellProps) {
  return (
    <AmbientPage variant={ambientVariant}>
      <SiteContainer className={cn("max-w-4xl pb-20 pt-8 sm:pt-10", className)}>
        <Link
          href={backHref}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-accent-soft"
        >
          <span aria-hidden>←</span> {backLabel}
        </Link>
        <div className="mt-6">{children}</div>
      </SiteContainer>
    </AmbientPage>
  );
}
