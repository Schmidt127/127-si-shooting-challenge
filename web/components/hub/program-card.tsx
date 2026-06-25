import Link from "next/link";

import type { ProductDefinition } from "@/lib/products";

type ProgramCardProps = {
  product: ProductDefinition;
  index: number;
  featured?: boolean;
};

function StatusBadge({
  status,
  launchLabel,
}: {
  status: ProductDefinition["status"];
  launchLabel?: string;
}) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-orange/30 bg-brand-orange/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-brand-orange">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-orange" aria-hidden />
        Live
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <span className="inline-flex rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-muted">
        Coming soon
      </span>
      {launchLabel ? (
        <span className="text-[10px] font-medium text-muted-subtle">{launchLabel}</span>
      ) : null}
    </span>
  );
}

export function ProgramCard({ product, index, featured = false }: ProgramCardProps) {
  const isLive = product.status === "live";
  const isExternal = product.external || /^https?:\/\//i.test(product.href);
  const canNavigate = Boolean(product.href) && product.href !== "#";

  const liveClassName =
    "inline-flex w-full items-center justify-center rounded-xl bg-brand-orange px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 sm:w-auto";
  const previewClassName =
    "inline-flex w-full items-center justify-center rounded-xl border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-foreground transition hover:border-white/20 hover:bg-white/[0.04] sm:w-auto";

  function renderCta(label: string, className: string) {
    if (!canNavigate) {
      return (
        <span className={`${className} cursor-not-allowed opacity-60`} aria-disabled="true">
          {label}
        </span>
      );
    }

    if (isExternal) {
      return (
        <a
          href={product.href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {label}
          <span className="ml-2 transition group-hover:translate-x-0.5" aria-hidden>
            ↗
          </span>
        </a>
      );
    }

    return (
      <Link href={product.href} className={className}>
        {label}
        <span className="ml-2 transition group-hover:translate-x-0.5" aria-hidden>
          →
        </span>
      </Link>
    );
  }

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition duration-300 ${
        featured
          ? "border-brand-orange/25 shadow-[0_0_0_1px_rgba(255,139,0,0.08)] hover:border-brand-orange/40"
          : "border-white/[0.08] hover:border-white/15 hover:bg-card-elevated"
      }`}
    >
      {featured ? (
        <div
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-orange/60 to-transparent"
          aria-hidden
        />
      ) : null}

      <div className="relative flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <span className="font-mono text-xs text-muted-subtle">
            {String(index + 1).padStart(2, "0")}
          </span>
          <StatusBadge status={product.status} launchLabel={product.launchLabel} />
        </div>

        <h2 className="mt-6 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {product.name}
        </h2>
        <p className="mt-2 text-sm font-medium text-foreground/80">{product.tagline}</p>
        <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{product.description}</p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label={`${product.name} features`}>
          {product.highlights.map((item) => (
            <li
              key={item}
              className="rounded-md border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[11px] font-medium text-muted"
            >
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          {isLive
            ? renderCta("Enter program", liveClassName)
            : renderCta("View preview", previewClassName)}
        </div>
      </div>
    </article>
  );
}
