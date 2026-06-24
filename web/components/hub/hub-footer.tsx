import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { BRAND_ORG_NAME } from "@/lib/brand";
import { PRODUCTS } from "@/lib/products";

export function HubFooter() {
  const liveProduct = PRODUCTS.find((p) => p.status === "live");

  return (
    <footer className="relative mt-24 border-t border-white/[0.06] pt-12 sm:mt-32 sm:pt-16">
      <div className="grid gap-10 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex flex-col gap-4">
          <BrandLogo variant="circle" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
          <p className="text-sm font-semibold text-foreground">{BRAND_ORG_NAME}</p>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Structured training challenges for athletes, schools, and clubs.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 sm:gap-12">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-subtle">
              Programs
            </p>
            <ul className="mt-4 space-y-2">
              {PRODUCTS.map((product) => (
                <li key={product.id}>
                  <Link
                    href={product.href}
                    className="text-sm text-muted transition hover:text-foreground"
                  >
                    {product.name}
                    {product.status === "coming-soon" ? (
                      <span className="ml-1.5 text-[10px] uppercase text-muted-subtle">
                        Soon
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-subtle">
              Quick links
            </p>
            <ul className="mt-4 space-y-2">
              {liveProduct ? (
                <li>
                  <Link
                    href={`${liveProduct.href}/leaderboard`}
                    className="text-sm text-muted transition hover:text-foreground"
                  >
                    Leaderboard
                  </Link>
                </li>
              ) : null}
              <li>
                <Link href="/" className="text-sm text-muted transition hover:text-foreground">
                  All programs
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-muted-subtle sm:flex-row sm:items-center sm:justify-between">
        <p>&copy; {new Date().getFullYear()} {BRAND_ORG_NAME}</p>
        <p>Hoop Challenges — train with purpose.</p>
      </div>
    </footer>
  );
}
