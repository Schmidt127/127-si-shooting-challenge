import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

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

/**
 * Shared program chrome. Header/footer live in `components/site` so landing
 * and catalog pages can reuse the same template pieces.
 */
export function ProductShell({
  productName,
  productLabel,
  navItems,
  children,
}: ProductShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-brand-blue/[0.05] blur-3xl" />
        <div className="absolute right-0 top-1/3 h-64 w-64 rounded-full bg-brand-orange/[0.05] blur-3xl" />
      </div>

      <SiteHeader
        productName={productName}
        productLabel={productLabel}
        navItems={navItems}
      />

      <main className="relative flex-1">{children}</main>

      <SiteFooter productName={productName} />
    </div>
  );
}
