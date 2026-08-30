import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import type { ProductNavItem } from "@/components/layout/product-shell";
import { SiteContainer } from "@/components/site/site-container";
import { Separator } from "@/components/ui/separator";
import { LANDING_URL } from "@/lib/app-config";
import { BRAND_ORG_NAME } from "@/lib/brand";
import {
  FOOTER_CONSENT_COPY,
  FOOTER_FAQ_HINT,
  FOOTER_QUICK_LINKS,
  FOOTER_REGISTRATION_LINKS,
} from "@/lib/site-chrome/footer-config";

type SiteFooterProps = {
  productName: string;
  navItems?: ProductNavItem[];
};

/**
 * Shared program footer — brand stamp, quick links, registration, consent copy.
 */
export function SiteFooter({
  productName,
  navItems = FOOTER_QUICK_LINKS,
}: SiteFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="h-1 w-full bg-gradient-to-r from-brand-blue via-brand-blue to-brand-orange" aria-hidden />
      <SiteContainer className="py-10 sm:py-12">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)_minmax(0,0.95fr)] lg:items-start lg:gap-12">
          <div className="flex items-start gap-4">
            <BrandLogo
              variant="circle"
              className="h-12 w-12 object-contain"
              alt={`${BRAND_ORG_NAME} logo — Fairfield Basketball Club`}
            />
            <div className="space-y-2">
              <p className="text-base font-bold text-foreground">{BRAND_ORG_NAME}</p>
              <p className="text-sm font-medium text-foreground">{productName}</p>
              <p className="max-w-md text-sm leading-relaxed text-foreground">
                Annual online Educational Athletics shooting challenge for boys and girls in grades
                1–12. {BRAND_ORG_NAME} is the legally recognized nonprofit based in Fairfield,
                Montana; Fairfield Basketball Club is the program identity for this challenge.
                Athletes participate 100% online from anywhere in the world.
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
                  className="sc-text-link inline-flex min-h-11 items-center text-sm"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-soft">
                Join the program
              </p>
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
        </div>

        <Separator className="my-8" />

        <div className="space-y-4">
          <p className="max-w-4xl text-xs leading-relaxed text-muted-foreground">
            {FOOTER_CONSENT_COPY}
          </p>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              © <span suppressHydrationWarning>{new Date().getFullYear()}</span> {BRAND_ORG_NAME}. All rights reserved.
            </p>
            <a
              href={LANDING_URL}
              className="sc-text-link inline-flex min-h-11 items-center text-sm"
            >
              Fairfield Basketball Club home
            </a>
          </div>
        </div>
      </SiteContainer>
    </footer>
  );
}
