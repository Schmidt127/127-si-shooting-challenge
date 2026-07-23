"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import type { ProductNavItem } from "@/components/layout/product-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { splitNavItems } from "@/lib/navigation/nav-priority";
import { ACCESSIBILITY_LABELS } from "@/lib/release/public-surface";
import { cn } from "@/lib/utils";

type ProductNavProps = {
  productName: string;
  items: ProductNavItem[];
};

function pathMatches(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return cn(
    "inline-flex min-h-11 shrink-0 items-center rounded-md px-3.5 py-2.5 text-[0.9375rem] font-semibold transition",
    active
      ? "bg-brand-blue text-brand-white shadow-site-sm ring-1 ring-brand-orange/45"
      : "text-foreground/80 hover:bg-brand-light-gray hover:text-foreground",
  );
}

export function ProductNav({ productName, items }: ProductNavProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { primary, more } = splitNavItems(items);

  if (items.length === 0) return null;

  const moreActive = more.some((item) => pathMatches(pathname, item.href));

  return (
    <nav
      className="-mx-1 flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:gap-2 sm:overflow-visible sm:pb-0"
      aria-label={
        productName.trim().toLowerCase() === "shooting challenge"
          ? `${ACCESSIBILITY_LABELS.productNav} navigation`
          : `${productName} navigation`
      }
    >
      <p className="sr-only">
        Primary links stay visible. Additional sections are under More.
      </p>
      {primary.map((item) => {
        const active = pathMatches(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={navLinkClass(active)}
          >
            {item.label}
          </Link>
        );
      })}

      {more.length > 0 ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            className={cn(navLinkClass(moreActive), "gap-1")}
            data-active={moreActive || undefined}
          >
            More
            <ChevronDownIcon className="size-4 opacity-80" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-48">
            {more.map((item) => {
              const active = pathMatches(pathname, item.href);
              return (
                <DropdownMenuItem
                  key={item.href}
                  className={cn(
                    "min-h-11 cursor-pointer text-[0.9375rem] font-medium",
                    active ? "bg-brand-blue/10 text-brand-blue" : null,
                  )}
                  onClick={() => router.push(item.href)}
                >
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </nav>
  );
}
