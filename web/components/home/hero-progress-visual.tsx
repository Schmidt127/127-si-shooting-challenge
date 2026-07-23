/**
 * CSS interface graphic for the landing hero — court + XP progress card.
 * No stock photography; uses brand colors only.
 */
export function HeroProgressVisual() {
  return (
    <div
      className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg bg-court-navy shadow-site-lg ring-1 ring-white/20"
      aria-hidden
    >
      <div className="absolute inset-0 court-lines opacity-40" />
      <div className="absolute inset-x-0 bottom-0 h-28 shot-arc opacity-90" />

      <div className="relative p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand-orange">
              Season progress
            </p>
            <p className="mt-1 font-display text-lg text-brand-white">Shot tracker</p>
          </div>
          <span className="rounded-md bg-brand-orange px-2.5 py-1 font-mono text-xs font-bold text-brand-charcoal">
            LIVE
          </span>
        </div>

        <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-md bg-brand-blue/40 ring-1 ring-white/15">
          {/* Half-court outline */}
          <svg viewBox="0 0 200 150" className="absolute inset-0 h-full w-full text-white/35">
            <rect x="8" y="8" width="184" height="134" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M8 75h184" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="75" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M70 8v28a30 30 0 0 0 60 0V8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="100" cy="28" r="5" fill="currentColor" className="text-brand-orange" />
          </svg>

          {/* Shot markers */}
          <span className="absolute left-[22%] top-[30%] size-2.5 rounded-full bg-brand-orange shadow-[0_0_0_3px_rgba(255,139,0,0.25)]" />
          <span className="absolute left-[48%] top-[42%] size-2 rounded-full bg-brand-white" />
          <span className="absolute left-[63%] top-[28%] size-2.5 rounded-full bg-brand-orange shadow-[0_0_0_3px_rgba(255,139,0,0.25)]" />
          <span className="absolute left-[34%] top-[58%] size-2 rounded-full bg-brand-white/80" />
          <span className="absolute left-[71%] top-[55%] size-2.5 rounded-full bg-brand-orange" />
          <span className="absolute left-[18%] top-[68%] size-2 rounded-full bg-brand-white/70" />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-md bg-white/10 px-2.5 py-2 ring-1 ring-white/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-contrast-muted">XP</p>
            <p className="mt-0.5 font-mono text-base font-bold text-brand-white">12,480</p>
          </div>
          <div className="rounded-md bg-white/10 px-2.5 py-2 ring-1 ring-white/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-contrast-muted">Level</p>
            <p className="mt-0.5 font-mono text-base font-bold text-brand-orange">7</p>
          </div>
          <div className="rounded-md bg-white/10 px-2.5 py-2 ring-1 ring-white/15">
            <p className="text-[10px] font-bold uppercase tracking-wider text-contrast-muted">Streak</p>
            <p className="mt-0.5 font-mono text-base font-bold text-brand-white">4</p>
          </div>
        </div>
      </div>
    </div>
  );
}
