import { HUB_PILLARS } from "@/lib/products";

export function HubPillars() {
  return (
    <section className="relative mt-20 sm:mt-28" aria-labelledby="pillars-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="pillars-heading"
            className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-blue"
          >
            How it works
          </h2>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Built for real training culture
          </p>
        </div>
        <p className="max-w-sm text-sm text-muted">
          Every program follows the same competitive backbone — reps, tracking, and standings.
        </p>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.06] sm:grid-cols-3">
        {HUB_PILLARS.map((pillar, index) => (
          <article
            key={pillar.label}
            className="group relative bg-card px-6 py-8 transition hover:bg-card-elevated sm:px-8 sm:py-10"
          >
            <span className="font-mono text-xs text-muted-subtle">
              {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
              {pillar.label}
            </p>
            <h3 className="mt-2 text-lg font-bold text-foreground">{pillar.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-muted">{pillar.body}</p>
            <div
              className="absolute bottom-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition group-hover:opacity-100 sm:left-8 sm:right-8"
              aria-hidden
            />
          </article>
        ))}
      </div>
    </section>
  );
}
