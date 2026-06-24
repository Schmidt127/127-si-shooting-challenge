import Link from "next/link";

import { BrandLogo } from "@/components/brand/brand-logo";
import { HUB_BRAND } from "@/lib/products";

export function HubHero() {
  return (
    <section className="relative pt-12 sm:pt-16 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden />
            {HUB_BRAND.parentOrg}
          </p>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {HUB_BRAND.title}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
            {HUB_BRAND.tagline}
          </p>

          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-subtle sm:text-base">
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

          <dl className="mt-12 grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-8 sm:gap-8">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
                Live now
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">1</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
                Programs
              </dt>
              <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">3</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-subtle">
                Focus
              </dt>
              <dd className="mt-1 text-sm font-bold uppercase tracking-wide text-brand-blue sm:text-base">
                Basketball
              </dd>
            </div>
          </dl>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div
            className="absolute -inset-4 rounded-3xl border border-white/[0.04] bg-gradient-to-br from-white/[0.02] to-transparent"
            aria-hidden
          />
          <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-card-elevated px-8 py-12 sm:px-10 sm:py-14">
            <BrandLogo
              variant="horizontal"
              priority
              className="h-auto w-full max-w-[18rem] object-contain sm:max-w-xs"
            />
            <div className="mt-8 flex w-full items-center gap-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gray/40 to-transparent" />
              <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-subtle">
                Est. intensity
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-brand-gray/40 to-transparent" />
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-muted">
              Official training hub for 127 Sports Intensity programs — built for athletes who
              want structure, not guesswork.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
