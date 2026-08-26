/**
 * Decorative ladder rails for the Levels page hero — subtle, non-interactive, screen-reader hidden.
 */
export function LadderHeroDecoration() {
  const rungTops = ["18%", "30%", "42%", "54%", "66%", "78%"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute bottom-0 left-[14%] top-[8%] w-px bg-brand-blue/14" />
      <div className="absolute bottom-0 right-[14%] top-[8%] w-px bg-brand-blue/14" />
      {rungTops.map((top) => (
        <div
          key={top}
          className="absolute left-[14%] right-[14%] h-px bg-brand-blue/10"
          style={{ top }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card/80 to-transparent" />
    </div>
  );
}
