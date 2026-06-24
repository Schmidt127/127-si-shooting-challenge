import { ProgramCard } from "@/components/hub/program-card";
import { HUB_BRAND, PRODUCTS } from "@/lib/products";

export function HubLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -left-32 top-0 h-[28rem] w-[28rem] rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-orange-600/5 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-accent-soft">
            {HUB_BRAND.parentOrg}
          </p>
          <h1 className="mt-4 bg-gradient-to-br from-white via-white to-orange-200/90 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl lg:text-6xl">
            {HUB_BRAND.title}
          </h1>
          <p className="mt-5 text-lg text-muted sm:text-xl">{HUB_BRAND.tagline}</p>
          <div className="mx-auto mt-8 h-px w-24 bg-gradient-to-r from-transparent via-accent to-transparent" />
        </header>

        <section className="mt-16 sm:mt-20" aria-labelledby="programs-heading">
          <div className="mb-10 flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2
                id="programs-heading"
                className="text-sm font-semibold uppercase tracking-[0.25em] text-muted"
              >
                Programs
              </h2>
              <p className="mt-2 text-2xl font-bold text-foreground">Choose your challenge</p>
            </div>
            <p className="max-w-xs text-right text-sm text-muted">
              Each program has its own experience. Select one to continue.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PRODUCTS.map((product, index) => (
              <ProgramCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-white/10 pt-10 text-center">
          <p className="text-sm font-medium text-foreground">{HUB_BRAND.parentOrg}</p>
          <p className="mt-2 text-xs text-muted">
            Structured training challenges for athletes, schools, and clubs.
          </p>
        </footer>
      </div>
    </div>
  );
}
