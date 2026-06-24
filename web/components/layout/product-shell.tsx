import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BackToHubLink } from "@/components/layout/back-to-hub-link";

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
            <Link
              href="/"
              className="transition-opacity hover:opacity-90"
              aria-label="127 Sports Intensity — all programs"
            >
              <BrandLogo
                variant="horizontal"
                className="h-8 w-auto max-w-[10rem] object-contain object-right sm:h-9 sm:max-w-[11rem]"
              />
            </Link>
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

            {navItems.length > 0 ? (
              <nav
                className="flex flex-wrap gap-1"
                aria-label={`${productName} navigation`}
              >
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/[0.04] hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            ) : null}
          </div>
        </div>
      </header>

      <main className="relative">{children}</main>
    </div>
  );
}
