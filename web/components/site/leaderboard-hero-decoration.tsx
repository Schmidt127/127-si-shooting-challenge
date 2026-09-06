import { withBasePath } from "@/lib/app-config";

/**
 * Decorative full-bleed photo under the Leaderboard contrast hero.
 * Subtle through the blue wash; non-interactive; screen-reader hidden.
 */
export function LeaderboardHeroDecoration() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative hero wash; fixed aspect via absolute fill avoids CLS */}
      <img
        src={withBasePath("/images/shooting-challenge-leaderboard.webp")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-[0.28] motion-reduce:opacity-[0.2]"
        decoding="async"
        fetchPriority="low"
      />
      <div className="absolute inset-0 bg-brand-blue/50" />
      <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/35 via-transparent to-court-navy/55" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-brand-blue/80 to-transparent" />
    </div>
  );
}
