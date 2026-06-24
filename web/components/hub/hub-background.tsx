/** Decorative background — motion lines echo the 127 SI logo mark. */

export function HubBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Soft ambient — very restrained */}
      <div className="absolute -left-40 top-0 h-[32rem] w-[32rem] rounded-full bg-brand-blue/[0.04] blur-3xl" />
      <div className="absolute -right-32 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-white/[0.02] blur-3xl" />

      {/* Logo-inspired speed lines */}
      <div className="absolute left-0 top-[18%] flex gap-2 opacity-[0.07]">
        <span className="block h-24 w-1 -skew-x-12 bg-brand-blue" />
        <span className="block h-16 w-1 -skew-x-12 bg-brand-blue" />
        <span className="block h-32 w-1 -skew-x-12 bg-brand-blue" />
        <span className="block h-20 w-1 -skew-x-12 bg-brand-blue" />
      </div>

      {/* Subtle court-grid */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      {/* Bottom edge */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  );
}
