import type { ReactNode } from "react";

type DisplayHeadingProps = {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  subtitle?: string;
  align?: "center" | "left";
  children?: ReactNode;
};

/**
 * Hero typography — makes plain Airtable titles feel intentional on public pages.
 */
export function DisplayHeading({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  align = "center",
  children,
}: DisplayHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";

  return (
    <header className={alignClass}>
      <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.38em] text-accent-soft">
        <span className="h-px w-6 bg-gradient-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
        {eyebrow}
        <span className="h-px w-6 bg-gradient-to-r from-transparent via-accent/70 to-transparent" aria-hidden />
      </p>

      <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-tight sm:text-5xl lg:text-6xl">
        <span className="block bg-gradient-to-br from-white via-white to-white/75 bg-clip-text text-transparent">
          {title}
        </span>
        {titleAccent ? (
          <span className="mt-1 block bg-gradient-to-r from-accent via-amber-300 to-brand-blue bg-clip-text text-transparent italic">
            {titleAccent}
          </span>
        ) : null}
      </h1>

      {subtitle ? (
        <p className={`mt-5 max-w-2xl text-base text-muted sm:text-lg ${align === "center" ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      ) : null}

      {children}
    </header>
  );
}

type DetailTitleProps = {
  overline?: string;
  title: string;
  accent?: string;
  className?: string;
};

export function DetailTitle({ overline, title, accent, className = "" }: DetailTitleProps) {
  return (
    <div className={className}>
      {overline ? (
        <p className="text-[10px] font-bold uppercase tracking-[0.32em] text-accent-soft">{overline}</p>
      ) : null}
      <h1 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h1>
      {accent ? (
        <p className="mt-2 text-lg font-medium italic text-muted sm:text-xl">{accent}</p>
      ) : null}
    </div>
  );
}

type SectionHeadingProps = {
  label: string;
  title: string;
  description?: string;
};

export function SectionHeading({ label, title, description }: SectionHeadingProps) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-blue">{label}</p>
      <h2 className="mt-2 text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      {description ? <p className="mt-2 text-sm text-muted">{description}</p> : null}
    </div>
  );
}
