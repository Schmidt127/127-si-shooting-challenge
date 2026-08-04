import Link from "next/link";

import { cn } from "@/lib/utils";

type AthleteProfileLinkProps = {
  name: string;
  slug?: string | null;
  className?: string;
};

/**
 * Links an athlete display name to `/athletes/[slug]` when a public profile exists.
 * Otherwise renders plain text (no broken links).
 */
export function AthleteProfileLink({ name, slug, className }: AthleteProfileLinkProps) {
  if (!slug) {
    return <span className={className}>{name}</span>;
  }

  return (
    <Link
      href={`/athletes/${slug}`}
      className={cn(
        "rounded-sm font-semibold text-foreground underline-offset-4 transition-colors",
        "hover:text-brand-blue hover:underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2",
        className,
      )}
    >
      {name}
    </Link>
  );
}
