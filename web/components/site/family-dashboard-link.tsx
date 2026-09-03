import Link from "next/link";
import type { VariantProps } from "class-variance-authority";

import { buttonVariants } from "@/components/ui/button";
import {
  FAMILY_DASHBOARD_APP_HREF,
  FAMILY_DASHBOARD_DESCRIPTION,
  FAMILY_DASHBOARD_LABEL,
} from "@/lib/navigation/family-dashboard-link";
import { cn } from "@/lib/utils";

type FamilyDashboardLinkProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  testId?: string;
  title?: string;
};

/**
 * Polished public entry to parent sign-in. Next.js prepends `basePath`.
 */
export function FamilyDashboardLink({
  variant = "outline",
  size = "sm",
  className,
  testId = "family-dashboard-link",
  title = FAMILY_DASHBOARD_DESCRIPTION,
}: FamilyDashboardLinkProps) {
  return (
    <Link
      href={FAMILY_DASHBOARD_APP_HREF}
      data-testid={testId}
      title={title}
      className={cn(buttonVariants({ variant, size }), className)}
    >
      {FAMILY_DASHBOARD_LABEL}
    </Link>
  );
}
