import type { ComponentType, ReactNode } from "react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  title: string;
  description: string;
  eyebrow?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
  href?: string;
  featured?: boolean;
  /** Lighter benefit tiles vs default elevated cards. */
  tone?: "default" | "benefit";
  footer?: ReactNode;
  className?: string;
};

/**
 * Shared feature / hub card. Prefer moderate radius + border over heavy pills.
 */
export function FeatureCard({
  title,
  description,
  eyebrow,
  icon: Icon,
  href,
  featured = false,
  tone = "default",
  footer,
  className,
}: FeatureCardProps) {
  const benefit = tone === "benefit";

  const body = (
    <Card
      size="sm"
      className={cn(
        "h-full rounded-lg transition duration-200",
        benefit
          ? "bg-transparent shadow-none ring-0 border-0 gap-0 py-0"
          : featured
            ? "bg-gradient-to-br from-brand-orange/12 via-card to-brand-blue/8 shadow-site-sm ring-brand-orange/35"
            : "bg-card shadow-site-sm ring-border",
        href && !benefit
          ? "hover:-translate-y-0.5 hover:shadow-site-md hover:ring-brand-blue/35"
          : null,
        href && benefit ? "hover:bg-brand-blue/[0.04]" : null,
        className,
      )}
    >
      <CardHeader
        className={cn(
          "gap-2",
          benefit && "rounded-lg border border-border/80 bg-card/70 px-3 py-3 sm:px-4 sm:py-4",
        )}
      >
        {Icon ? (
          <span
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-md sm:size-9",
              featured || benefit
                ? "bg-brand-orange/12 text-accent-soft"
                : "bg-brand-blue/10 text-brand-blue",
            )}
          >
            <Icon size={18} className="size-[18px]" aria-hidden />
          </span>
        ) : null}
        {eyebrow ? (
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-soft sm:text-[11px] sm:tracking-[0.18em]">
            {eyebrow}
          </p>
        ) : null}
        <CardTitle className="font-display text-sm font-bold leading-snug text-foreground sm:text-base">
          {title}
        </CardTitle>
        <CardDescription className="text-[0.8125rem] leading-snug text-muted-foreground sm:text-sm">
          {description}
        </CardDescription>
      </CardHeader>
      {footer ? <CardContent className="pt-0">{footer}</CardContent> : null}
    </Card>
  );

  if (!href) return body;

  return (
    <Link
      href={href}
      className="group block h-full rounded-lg focus-visible:outline-none"
    >
      {body}
    </Link>
  );
}
