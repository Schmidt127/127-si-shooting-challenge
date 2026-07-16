import { BackToHubLink } from "@/components/layout/back-to-hub-link";
import { ProductNav } from "@/components/layout/product-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LANDING_URL } from "@/lib/app-config";
import { BRAND_ORG_NAME } from "@/lib/brand";

export type ProductNavItem = {
  label: string;
  href: string;
};

type ProductShellProps = {
  productName: string;
  productLabel?: string;
  navItems: ProductNavItem[];
  children: React.ReactNode;
};

export function ProductShell({
  productName,
  productLabel,
  navItems,
  children,
}: ProductShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-blue/[0.06] blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-accent/[0.05] blur-3xl" />
      </div>

      <header className="relative border-b border-border bg-card/95 backdrop-blur-md">
        <div className="absolute inset-0 court-lines opacity-50" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 h-24 shot-arc opacity-70" aria-hidden />

        <div className="relative mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-h-[2.75rem] items-center gap-3">
              <a
                href={LANDING_URL}
                className="shrink-0 rounded-full transition-opacity hover:opacity-90"
                aria-label={`${BRAND_ORG_NAME} — Hoop Challenges home`}
              >
                <BrandLogo
                  variant="circle"
                  className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                  priority
                />
              </a>
              <BackToHubLink />
            </div>
            <a
              href={LANDING_URL}
              className="hidden transition-opacity hover:opacity-90 sm:block"
              aria-label={`${BRAND_ORG_NAME} wordmark`}
            >
              <BrandLogo
                variant="horizontal"
                className="h-7 w-auto max-w-[9.5rem] object-contain object-right sm:h-8 sm:max-w-[11rem]"
              />
            </a>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {productLabel ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent-soft">
                  {productLabel}
                </p>
              ) : null}
              {/* Product title is a p — pages own the single h1 */}
              <p className="font-display mt-1 text-2xl tracking-tight text-foreground sm:text-3xl">
                {productName}
              </p>
            </div>

            <ProductNav productName={productName} items={navItems} />
          </div>
        </div>
      </header>

      <main className="relative flex-1">{children}</main>

      <footer className="relative mt-auto border-t border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-3">
            <BrandLogo variant="circle" className="h-8 w-8 object-contain" />
            <div>
              <p className="text-sm font-semibold text-foreground">{BRAND_ORG_NAME}</p>
              <p className="text-xs text-muted">{productName}</p>
            </div>
          </div>
          <a
            href={LANDING_URL}
            className="text-sm font-medium text-muted transition hover:text-accent-soft"
          >
            Hoop Challenges home
          </a>
        </div>
      </footer>
    </div>
  );
}
