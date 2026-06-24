import Link from "next/link";

import { BackToHubLink } from "@/components/layout/back-to-hub-link";
import { HUB_BRAND } from "@/lib/products";

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
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <header className="relative border-b border-white/10 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <BackToHubLink />
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
              {HUB_BRAND.parentOrg}
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              {productLabel ? (
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-soft">
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
                    className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-foreground"
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
