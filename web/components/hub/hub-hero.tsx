import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { HUB_BRAND } from "@/lib/products";

export function HubHero() {
  return (
    <section className="relative pt-10 sm:pt-14 lg:pt-16">
      {/* Primary brand lockup — centered and large */}
      <div className="flex flex-col items-center text-center">
        <BrandLogo
          variant="horizontal"
          priority
          className="h-auto w-full max-w-[min(100%,20rem)] object-contain sm:max-w-md md:max-w-lg"
        />

        <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden />
          {HUB_BRAND.parentOrg}
        </p>

        <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          {HUB_BRAND.title}
        </h1>

        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:text-xl">
          {HUB_BRAND.tagline}
        </p>

        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-subtle sm:text-base">
          {HUB_BRAND.description}
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/shooting-challenge"
            className="inline-flex items-center justify-center rounded-xl bg-brand-orange px-6 py-3.5 text-sm font-semibold text-white shadow-[0_0_0_1px_rgba(255,139,0,0.2)] transition hover:brightness-110"
          >
            Enter Shooting Challenge
          </Link>
          <a
            href="#programs"
            className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-transparent px-6 py-3.5 text-sm font-semibold text-foreground transition hover:border-white/25 hover:bg-white/[0.04]"
          >
            View all programs
          </a>
        </div>
      </div>

      <dl className="mx-auto mt-14 grid max-w-3xl grid-cols-3 gap-4 border-y border-white/[0.06] py-8 sm:gap-8">
        <div className="text-center">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
            Live now
          </dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">1</dd>
        </div>
        <div className="text-center">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
            Programs
          </dt>
          <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">3</dd>
        </div>
        <div className="text-center">
          <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
            Focus
          </dt>
          <dd className="mt-1 text-sm font-bold uppercase tracking-wide text-brand-blue sm:text-base">
            Basketball
          </dd>
        </div>
      </dl>
    </section>
  );
}
