import Link from "next/link";
import type { ComponentProps } from "react";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CtaLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & {
    iconStart?: React.ReactNode;
    iconEnd?: React.ReactNode;
  };

/** Next.js Link styled with shared Button variants (Base UI Vega button styles). */
export function CtaLink({
  className,
  variant = "default",
  size = "default",
  iconStart,
  iconEnd,
  children,
  ...props
}: CtaLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {iconStart ? <span data-icon="inline-start">{iconStart}</span> : null}
      {children}
      {iconEnd ? <span data-icon="inline-end">{iconEnd}</span> : null}
    </Link>
  );
}
