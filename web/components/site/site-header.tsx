import { BrandLogo } from "@/components/brand/brand-logo";
import { ProductNav } from "@/components/layout/product-nav";
import type { ProductNavItem } from "@/components/layout/product-shell";
import { SiteContainer } from "@/components/site/site-container";
import { CtaLink } from "@/components/site/cta-link";
import { LANDING_URL } from "@/lib/app-config";
import { BRAND_ORG_NAME } from "@/lib/brand";

type SiteHeaderProps = {
  productName: string;
  productLabel?: string;
  navItems: ProductNavItem[];
};

/**
 * Shared program header — logo, product identity, navigation, primary CTA.
 * Used by ProductShell so every catalog page inherits the same chrome.
 */
export function SiteHeader({
  productName,
  productLabel = "Program",
  navItems,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-site-sm backdrop-blur-md">
      <div className="pointer-events-none absolute inset-0 court-lines opacity-30" aria-hidden />
      <SiteContainer className="relative flex flex-col gap-2.5 py-3 sm:gap-3 sm:py-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href={LANDING_URL}
              className="shrink-0 rounded-full transition-opacity hover:opacity-90"
              aria-label={`${BRAND_ORG_NAME} — Hoop Challenges home`}
            >
              <BrandLogo
                variant="circle"
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
                priority
              />
            </a>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-accent-soft">
                {productLabel}
              </p>
              <p className="font-display truncate text-base tracking-tight text-foreground sm:text-lg">
                {productName}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <a
              href={LANDING_URL}
              className="hidden transition-opacity hover:opacity-90 lg:block"
              aria-label={`${BRAND_ORG_NAME} wordmark`}
            >
              <BrandLogo
                variant="horizontal"
                className="h-7 w-auto max-w-[10rem] object-contain object-right xl:h-8 xl:max-w-[12rem]"
              />
            </a>
            <CtaLink href="/leaderboard" variant="cta" size="sm">
              Leaderboard
            </CtaLink>
          </div>
        </div>

        <ProductNav productName={productName} items={navItems} />
      </SiteContainer>
    </header>
  );
}
