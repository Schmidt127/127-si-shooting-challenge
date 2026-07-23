import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SiteContainerProps = ComponentProps<"div">;

/** Shared horizontal page gutters + max width for header, hero, content, footer. */
export function SiteContainer({ className, ...props }: SiteContainerProps) {
  return <div className={cn("site-container", className)} {...props} />;
}
