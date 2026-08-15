import { cn } from "@/lib/utils";

type ProgramFeatureBannerProps = {
  title: string;
  caption: string;
  mark?: string;
  className?: string;
};

/**
 * Non-illustrative feature banner — brand typography and color only.
 * Replaces AI-generated program photography on public catalog pages.
 */
export function ProgramFeatureBanner({
  title,
  caption,
  mark = "SC",
  className,
}: ProgramFeatureBannerProps) {
  return (
    <figure
      className={cn(
        "mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-brand-blue text-brand-white shadow-site-sm",
        className,
      )}
    >
      <div className="relative overflow-hidden px-6 py-10 sm:px-10 sm:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(255,139,0,0.42) 0%, transparent 45%, rgba(255,255,255,0.08) 100%)",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-10 -top-12 size-40 rounded-full border border-white/15 sm:size-56"
          aria-hidden
        />
        <p className="relative font-display text-6xl font-black tracking-tight text-white/20 sm:text-7xl">
          {mark}
        </p>
        <h2 className="relative mt-2 max-w-2xl font-display text-2xl font-extrabold leading-tight text-brand-white sm:text-3xl">
          {title}
        </h2>
      </div>
      <figcaption className="border-t border-white/15 bg-brand-blue/95 px-4 py-3 text-center text-xs text-contrast-muted sm:px-6">
        {caption}
      </figcaption>
    </figure>
  );
}
