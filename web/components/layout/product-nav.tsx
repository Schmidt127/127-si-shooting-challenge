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

export function ProductNav({ productName, items }: ProductNavProps) {
  const pathname = usePathname() || "/";

  if (items.length === 0) return null;

  return (
    <nav
      className="-mx-1 flex gap-1 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0"
      aria-label={`${productName} navigation`}
    >
      {items.map((item) => {
        const active = pathMatches(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-white/[0.08] text-foreground ring-1 ring-white/15"
                : "text-muted hover:bg-white/[0.04] hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
