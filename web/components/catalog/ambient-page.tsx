import type { ReactNode } from "react";

type AmbientPageProps = {
  children: ReactNode;
  variant?: "default" | "levels" | "tutorials" | "zoom" | "shoutouts" | "articles";
};

export type { AmbientPageProps };

const VARIANT_GLOWS: Record<NonNullable<AmbientPageProps["variant"]>, ReactNode> = {
  default: (
    <>
      <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-blue/12 blur-3xl" />
      <div className="absolute -right-20 top-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
    </>
  ),
  levels: (
    <>
      <div className="absolute left-1/4 top-0 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />
    </>
  ),
  tutorials: (
    <>
      <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute bottom-20 left-0 h-72 w-72 rounded-full bg-brand-blue/15 blur-3xl" />
    </>
  ),
  zoom: (
    <>
      <div className="absolute -left-20 top-0 h-96 w-96 rounded-full bg-cyan-400/12 blur-3xl" />
      <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-brand-blue/12 blur-3xl" />
    </>
  ),
  shoutouts: (
    <>
      <div className="absolute right-0 top-16 h-80 w-80 rounded-full bg-pink-500/10 blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
    </>
  ),
  articles: (
    <>
      <div className="absolute -left-16 top-20 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-16 right-10 h-72 w-72 rounded-full bg-violet-600/10 blur-3xl" />
    </>
  ),
};

export function AmbientPage({ children, variant = "default" }: AmbientPageProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {VARIANT_GLOWS[variant]}
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-500/6 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
