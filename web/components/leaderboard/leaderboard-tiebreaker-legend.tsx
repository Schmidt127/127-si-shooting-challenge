import Link from "next/link";

import { IconBolt, IconLevel, IconTarget } from "@/components/icons/shoot-icons";

const TIEBREAKERS = [
  {
    icon: IconLevel,
    label: "Level",
    detail: "Higher tier wins — Beginner to G.O.A.T.",
    accent: "text-violet-300",
    bg: "from-violet-500/15 to-violet-600/5",
  },
  {
    icon: IconBolt,
    label: "Lifetime XP",
    detail: "Total XP earned this season",
    accent: "text-amber-300",
    bg: "from-amber-500/15 to-orange-600/5",
  },
  {
    icon: IconTarget,
    label: "Total Shots",
    detail: "Verified makes + attempts logged",
    accent: "text-cyan-300",
    bg: "from-cyan-500/15 to-brand-blue/10",
  },
] as const;

export function LeaderboardTiebreakerLegend() {
  return (
    <section
      aria-label="How rankings are calculated"
      className="rounded-2xl border border-white/10 bg-card/50 p-5 backdrop-blur-xl sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-brand-blue">
            Ranking formula
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
            Level → XP → Shots
          </h2>
        </div>
        <Link
          href="/levels"
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/30 hover:text-accent-soft"
        >
          View level ladder →
        </Link>
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-3">
        {TIEBREAKERS.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className={`flex gap-3 rounded-xl border border-white/5 bg-gradient-to-br p-4 ${item.bg}`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 ${item.accent}`}
              >
                <Icon size={22} />
              </span>
              <div>
                <p className="font-mono text-[10px] font-bold text-muted">#{index + 1}</p>
                <p className="font-semibold text-foreground">{item.label}</p>
                <p className="mt-0.5 text-xs leading-snug text-muted">{item.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
