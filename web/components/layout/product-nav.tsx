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
              "inline-flex min-h-[2.75rem] shrink-0 items-center rounded-lg px-3 py-2 text-sm font-medium transition",
              active
                ? "bg-brand-blue text-brand-white ring-1 ring-brand-orange/50"
                : "text-muted hover:bg-brand-light-gray hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
