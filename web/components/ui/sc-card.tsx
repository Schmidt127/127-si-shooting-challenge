import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * SC card design system (FUT-043) — shared shells for homework rows, game log,
 * XP activity, and dashboard panels. Tokens live in `app/globals.css`; Hub
 * emails mirror values in `communications/emails/lib/card-tokens.js`.
 */

export function scCardListShell(className?: string): string {
  return cn(
    "sc-card-list overflow-hidden rounded-[var(--sc-card-radius)] border border-border bg-card shadow-site-sm divide-y divide-border",
    className,
  );
}

export function scCardRow(className?: string): string {
  return cn(
    "sc-card-row px-[var(--sc-card-padding-x)] py-[var(--sc-card-row-padding-y)] sm:px-[var(--sc-card-padding-x-md)]",
    className,
  );
}

/** Standalone bordered card (homework assignment rows). */
export function scCardStandalone(className?: string): string {
  return cn(
    "sc-card-standalone overflow-hidden rounded-[var(--sc-card-radius)] border border-border bg-card shadow-site-sm px-[var(--sc-card-padding-x)] py-4 sm:px-[var(--sc-card-padding-x-md)]",
    className,
  );
}

export function scCardPanel(className?: string): string {
  return cn(
    "sc-card-panel overflow-hidden rounded-[var(--sc-card-radius)] border border-border bg-card p-[var(--sc-card-panel-padding)] shadow-site-sm sm:p-[var(--sc-card-panel-padding-md)]",
    className,
  );
}

export function scCardInset(className?: string): string {
  return cn(
    "sc-card-inset rounded-[var(--sc-card-radius-sm)] border border-border-subtle bg-brand-light-gray px-[var(--sc-card-padding-x)] py-3",
    className,
  );
}

export function scCardEmpty(className?: string): string {
  return cn(
    "sc-card-empty rounded-[var(--sc-card-radius)] border border-dashed border-border bg-brand-light-gray/50 px-[var(--sc-card-padding-x)] py-5 text-sm text-muted",
    className,
  );
}

export function scCardSectionEyebrow(className?: string): string {
  return cn(
    "sc-card-section-eyebrow text-[length:var(--sc-card-eyebrow-size)] font-[number:var(--sc-card-eyebrow-weight)] uppercase tracking-[var(--sc-card-eyebrow-tracking)] text-brand-blue",
    className,
  );
}

export function scCardSectionTitle(className?: string): string {
  return cn(
    "sc-card-section-title mt-1 text-[length:var(--sc-card-section-title-size)] font-[number:var(--sc-card-section-title-weight)] text-foreground sm:text-2xl",
    className,
  );
}

export function scCardHeading(className?: string): string {
  return cn(
    "sc-card-heading text-[length:var(--sc-card-heading-size)] font-[number:var(--sc-card-heading-weight)] text-foreground",
    className,
  );
}

type ScCardSectionHeaderProps = {
  eyebrow: string;
  title: string;
  titleId?: string;
  className?: string;
};

export function ScCardSectionHeader({
  eyebrow,
  title,
  titleId,
  className,
}: ScCardSectionHeaderProps) {
  return (
    <div className={className}>
      <p className={scCardSectionEyebrow()}>{eyebrow}</p>
      <h2 id={titleId} className={scCardSectionTitle()}>
        {title}
      </h2>
    </div>
  );
}

type ScCardListProps = {
  children: ReactNode;
  className?: string;
  as?: "ol" | "ul";
};

export function ScCardList({ children, className, as: Tag = "ol" }: ScCardListProps) {
  return <Tag className={cn(scCardListShell(), "mt-5", className)}>{children}</Tag>;
}

type ScCardRowItemProps = {
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function ScCardRowItem({ children, className, testId }: ScCardRowItemProps) {
  return (
    <li className={scCardRow(className)} data-testid={testId}>
      {children}
    </li>
  );
}
