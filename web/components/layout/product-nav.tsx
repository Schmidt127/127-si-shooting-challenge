"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ProductNavItem } from "@/components/layout/product-shell";
import { cn } from "@/lib/utils";

type ProductNavProps = {
  productName: string;
  items: ProductNavItem[];
};

function pathMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary program nav — horizontal scroll on small screens (touch targets ≥2.75rem),
 * wraps on larger breakpoints. No separate drawer; scroll affordance is intentional.
 */
export function ProductNav({ productName, items }: ProductNavProps) {
  const pathname = usePathname() || "/";

  if (items.length === 0) return null;

  return (
    <nav aria-label={`${productName} navigation`} className="relative">
      <p className="mb-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted sm:hidden">
        Swipe for more pages
      </p>
      <div
        className={cn(
          "-mx-1 flex gap-1 overflow-x-auto overscroll-x-contain pb-1",
          "scroll-smooth snap-x snap-mandatory",
          "[scrollbar-width:thin]",
          "sm:flex-wrap sm:overflow-visible sm:pb-0 sm:snap-none",
        )}
      >
        {items.map((item) => {
          const active = pathMatches(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-[2.75rem] shrink-0 snap-start items-center rounded-lg px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-brand-blue text-brand-white ring-1 ring-brand-orange/50"
                  : "text-muted hover:bg-brand-light-gray hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
