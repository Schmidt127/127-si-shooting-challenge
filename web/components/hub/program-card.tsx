import Link from "next/link";

import type { ProductDefinition } from "@/lib/products";

type ProgramCardProps = {
  product: ProductDefinition;
  index: number;
};

function StatusBadge({ status }: { status: ProductDefinition["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
      Coming Soon
    </span>
  );
}

export function ProgramCard({ product, index }: ProgramCardProps) {
  const isLive = product.status === "live";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl transition duration-300 hover:border-white/20 hover:bg-card/80">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${product.accent} opacity-80 transition group-hover:opacity-100`}
        aria-hidden
      />
      <div
        className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-accent via-accent-soft to-transparent opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />

      <div className="relative flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="font-mono text-xs text-muted/60">
            {String(index + 1).padStart(2, "0")}
          </span>
          <StatusBadge status={product.status} />
        </div>

        <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {product.name}
        </h2>
        <p className="mt-2 text-sm font-medium text-accent-soft">{product.tagline}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{product.description}</p>

        <div className="mt-8">
          {isLive ? (
            <Link
              href={product.href}
              className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-accent to-orange-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:brightness-110 sm:w-auto"
            >
              Enter program
              <span className="ml-2 transition group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </Link>
          ) : (
            <Link
              href={product.href}
              className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-foreground transition hover:border-white/25 hover:bg-white/10 sm:w-auto"
            >
              View preview
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
