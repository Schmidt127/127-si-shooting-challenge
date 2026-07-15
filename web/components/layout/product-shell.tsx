import { BackToHubLink } from "@/components/layout/back-to-hub-link";
import { ProductNav } from "@/components/layout/product-nav";
import { BrandLogo } from "@/components/brand/brand-logo";
import { LANDING_URL } from "@/lib/app-config";

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
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-brand-blue/[0.03] blur-3xl" />
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-white/[0.015] blur-3xl" />
      </div>

      <header className="relative border-b border-white/[0.06] bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BackToHubLink />
            <a
              href={LANDING_URL}
              className="transition-opacity hover:opacity-90"
              aria-label="127 Sports Intensity — Hoop Challenges home"
            >
              <BrandLogo
                variant="horizontal"
                className="h-8 w-auto max-w-[10rem] object-contain object-right sm:h-9 sm:max-w-[11rem]"
              />
            </a>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {productLabel ? (
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">
                  {productLabel}
                </p>
              ) : null}
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {productName}
              </h1>
            </div>

            <ProductNav productName={productName} items={navItems} />
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>
    </div>
  );
}
