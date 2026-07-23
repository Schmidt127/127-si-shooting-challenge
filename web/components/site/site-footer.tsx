import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import type { ProductNavItem } from "@/components/layout/product-shell";
import { SiteContainer } from "@/components/site/site-container";
import { Separator } from "@/components/ui/separator";
import { LANDING_URL } from "@/lib/app-config";
import { BRAND_ORG_NAME } from "@/lib/brand";

type SiteFooterProps = {
  productName: string;
  navItems?: ProductNavItem[];
};

const FOOTER_QUICK_LINKS: ProductNavItem[] = [
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Homework", href: "/homework" },
  { label: "Levels", href: "/levels" },
  { label: "Tutorials", href: "/tutorials" },
  { label: "Zoom Meetings", href: "/zoom-meetings" },
  { label: "Game Manual", href: "/game-manual" },
];

/**
 * Shared program footer — brand stamp, quick links, return to Hoop Challenges.
 */
export function SiteFooter({
  productName,
  navItems = FOOTER_QUICK_LINKS,
}: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="h-1 w-full bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" aria-hidden />
      <SiteContainer className="py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <div className="flex items-start gap-4">
            <BrandLogo variant="circle" className="h-12 w-12 object-contain" />
            <div className="space-y-2">
              <p className="text-base font-bold text-foreground">{BRAND_ORG_NAME}</p>
              <p className="text-sm font-medium text-foreground/80">{productName}</p>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                A public training hub for shooting reps, weekly homework, levels, and live
                competition.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-soft">
              Quick links
            </p>
            <nav
              className="flex flex-wrap gap-x-5 gap-y-3"
              aria-label={`${productName} footer`}
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="min-h-11 inline-flex items-center text-sm font-semibold text-foreground transition hover:text-brand-blue"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {BRAND_ORG_NAME}. All rights reserved.
          </p>
          <a
            href={LANDING_URL}
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-blue transition hover:text-accent-soft"
          >
            Hoop Challenges home
          </a>
        </div>
      </SiteContainer>
    </footer>
  );
}
