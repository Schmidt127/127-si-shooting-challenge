import { ProgramCard } from "@/components/hub/program-card";
import { PRODUCTS } from "@/lib/products";

export function HubPrograms() {
  return (
    <section
      id="programs"
      className="relative mt-20 scroll-mt-24 sm:mt-28"
      aria-labelledby="programs-heading"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2
            id="programs-heading"
            className="text-[11px] font-bold uppercase tracking-[0.28em] text-brand-blue"
          >
            Programs
          </h2>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Choose your challenge
          </p>
        </div>
        <p className="max-w-xs text-sm text-muted sm:text-right">
          Each program has its own path and navigation. Start with what&apos;s live — previews
          available for what&apos;s next.
        </p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6">
        {PRODUCTS.map((product, index) => (
          <ProgramCard
            key={product.id}
            product={product}
            index={index}
            featured={product.status === "live"}
          />
        ))}
      </div>
    </section>
  );
}
