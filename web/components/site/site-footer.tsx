"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandLogo } from "@/components/brand/brand-logo";
import type { ProductNavItem } from "@/components/layout/product-shell";
import { SiteContainer } from "@/components/site/site-container";
import { Separator } from "@/components/ui/separator";
import { LANDING_URL } from "@/lib/app-config";
import { BRAND_ORG_NAME } from "@/lib/brand";
import {
  FOOTER_CONSENT_COPY,
  FOOTER_FAQ_HINT,
  FOOTER_QUICK_LINK_GROUPS,
  FOOTER_QUICK_LINKS,
  FOOTER_REGISTRATION_LINKS,
} from "@/lib/site-chrome/footer-config";

export type SiteFooterVariant = "default" | "landing";

type SiteFooterProps = {
  productName: string;
  navItems?: ProductNavItem[];
  /**
   * `"landing"` = /shoot home polish only.
   * Omit to auto-detect via pathname (`/` with basePath stripped).
   */
  variant?: SiteFooterVariant;
};

const SECTION_HEADING =
  "text-xs font-bold uppercase tracking-[0.18em] text-accent-soft";

function footerLinkTestId(href: string): string | undefined {
  return href === "/dashboard/sign-in" ? "family-dashboard-footer-link" : undefined;
}

function FooterBrandColumn({
  productName,
  compact,
}: {
  productName: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <BrandLogo
        variant="circle"
        className="h-12 w-12 object-contain"
        alt={`${BRAND_ORG_NAME} logo — Fairfield Basketball Club`}
      />
      <div className={compact ? "space-y-1.5" : "space-y-2"}>
        <p className="text-base font-bold text-foreground">{BRAND_ORG_NAME}</p>
        <p className="text-sm font-medium text-foreground">{productName}</p>
        <p
          className={
            compact
              ? "max-w-md text-[13px] leading-relaxed text-foreground"
              : "max-w-md text-sm leading-relaxed text-foreground"
          }
        >
          Annual online Educational Athletics shooting challenge for boys and girls in grades
          1–12. {BRAND_ORG_NAME} is the legally recognized nonprofit based in Fairfield,
          Montana; Fairfield Basketball Club is the program identity for this challenge.
          Athletes participate 100% online from anywhere in the world.
        </p>
      </div>
    </div>
  );
}

function FooterRegistrationColumn({ productName }: { productName: string }) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <p className={SECTION_HEADING}>Join the program</p>
        <nav aria-label={`${productName} registration links`} className="space-y-3">
          {FOOTER_REGISTRATION_LINKS.map((item) => (
            <div key={item.href}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="sc-text-link inline-flex min-h-11 items-center text-sm font-semibold"
                aria-label={`${item.label} (opens in a new tab)`}
              >
                {item.label}
                <span aria-hidden className="ml-1 text-xs opacity-80">
                  ↗
                </span>
              </a>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </nav>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {FOOTER_FAQ_HINT}{" "}
        <Link href="/faq" className="sc-text-link font-semibold">
          Program FAQ
        </Link>
        .
      </p>
    </div>
  );
}

function FooterBottomMatter() {
  return (
    <>
      <Separator className="my-8" />

      <div className="space-y-4">
        <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
          {FOOTER_CONSENT_COPY}
        </p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_ORG_NAME}.
            All rights reserved.
          </p>
          <a
            href={LANDING_URL}
            className="sc-text-link inline-flex min-h-11 items-center text-sm"
          >
            Fairfield Basketball Club home
          </a>
        </div>
      </div>
    </>
  );
}

function DefaultQuickLinks({
  productName,
  navItems,
}: {
  productName: string;
  navItems: ProductNavItem[];
}) {
  return (
    <div className="space-y-3">
      <p className={SECTION_HEADING}>Quick links</p>
      <nav className="flex flex-wrap gap-x-5 gap-y-3" aria-label={`${productName} footer`}>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            data-testid={footerLinkTestId(item.href)}
            className="sc-text-link inline-flex min-h-11 items-center text-sm"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function LandingQuickLinks({ productName }: { productName: string }) {
  return (
    <div className="space-y-4">
      <p className={SECTION_HEADING}>Quick links</p>
      <nav aria-label={`${productName} footer`}>
        <div className="grid grid-cols-2 gap-x-5 gap-y-6 sm:gap-x-8 lg:grid-cols-3 lg:gap-x-6">
          {FOOTER_QUICK_LINK_GROUPS.map((group) => (
            <div key={group.heading} className="min-w-0 space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {group.heading}
              </p>
              <ul className="space-y-0.5">
                {group.links.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-testid={footerLinkTestId(item.href)}
                      className="sc-text-link inline-flex min-h-11 items-center text-[13px]"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </nav>
    </div>
  );
}

/**
 * Shared program footer — brand stamp, quick links, registration, consent copy.
 * Landing variant is scoped to `/shoot` home (`pathname === "/"` with basePath).
 */
export function SiteFooter({
  productName,
  navItems = FOOTER_QUICK_LINKS,
  variant,
}: SiteFooterProps) {
  const pathname = usePathname();
  const resolvedVariant: SiteFooterVariant =
    variant ?? (pathname === "/" ? "landing" : "default");
  const isLanding = resolvedVariant === "landing";

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div
        className="h-1 w-full bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange"
        aria-hidden
      />
      <SiteContainer className="py-10 sm:py-12">
        {isLanding ? (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,0.26fr)_minmax(0,0.5fr)_minmax(0,0.24fr)] lg:items-start lg:gap-10 xl:gap-12">
            <FooterBrandColumn productName={productName} compact />
            <LandingQuickLinks productName={productName} />
            <FooterRegistrationColumn productName={productName} />
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12">
            <FooterBrandColumn productName={productName} />
            <DefaultQuickLinks productName={productName} navItems={navItems} />
            <FooterRegistrationColumn productName={productName} />
          </div>
        )}

        <FooterBottomMatter />
      </SiteContainer>
    </footer>
  );
}
