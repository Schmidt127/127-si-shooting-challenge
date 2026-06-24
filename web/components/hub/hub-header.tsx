import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";

export function HubHeader() {
  return (
    <header className="relative z-10 border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-3 transition-opacity hover:opacity-90"
        >
          <BrandLogo
            variant="circle"
            className="h-11 w-11 shrink-0 object-contain sm:hidden"
          />
          <BrandLogo
            variant="horizontal"
            priority
            className="hidden h-10 w-auto max-w-[11rem] object-contain object-left sm:block md:max-w-[13rem] lg:h-11 lg:max-w-[15rem]"
          />
        </Link>

        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Hub navigation">
          <a
            href="#programs"
            className="rounded-lg px-3 py-2 text-xs font-medium text-muted transition hover:bg-white/[0.04] hover:text-foreground sm:text-sm"
          >
            Programs
          </a>
          <Link
            href="/shooting-challenge"
            className="rounded-lg bg-brand-orange px-3 py-2 text-xs font-semibold text-white transition hover:brightness-110 sm:px-4 sm:text-sm"
          >
            Shooting Challenge
          </Link>
        </nav>
      </div>
    </header>
  );
}
