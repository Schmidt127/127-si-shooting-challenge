import { IconCrown } from "@/components/icons/shoot-icons";
import { formatGrade, formatShots, formatXp } from "@/lib/formatters";
import { getPodiumAccent } from "@/lib/leaderboard/level-styles";
import type { LeaderboardEntry } from "@/types/leaderboard";

import { AthleteAvatar } from "./athlete-avatar";
import { LevelBadge } from "./level-badge";

type LeaderboardPodiumProps = {
  entries: LeaderboardEntry[];
};

function PodiumCard({ entry }: { entry: LeaderboardEntry }) {
  const accent = getPodiumAccent(entry.rank);
  const isFirst = entry.rank === 1;

  return (
    <article
      className={`group relative flex flex-col items-center text-center transition-transform duration-500 hover:-translate-y-1 ${
        isFirst
          ? "order-1 z-10 sm:order-2 sm:-mt-8"
          : entry.rank === 2
            ? "order-2 sm:order-1"
            : "order-3"
      }`}
    >
      <div
        className={`absolute inset-x-4 top-16 h-32 rounded-full blur-3xl opacity-60 ${accent.halo}`}
        aria-hidden
      />

      {isFirst ? (
        <div className="relative mb-2 flex items-center justify-center text-amber-300">
          <IconCrown size={32} className="drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]" />
        </div>
      ) : (
        <div className="relative mb-2 font-mono text-xl font-bold tracking-widest text-accent-soft/90 sm:text-2xl">
          {accent.medal}
        </div>
      )}

      <AthleteAvatar
        name={entry.displayName}
        headshotUrl={entry.headshot?.url}
        size={isFirst ? "xl" : "lg"}
        rank={isFirst ? 1 : undefined}
        ringClass={
          entry.rank === 1
            ? "ring-amber-300/70"
            : entry.rank === 2
              ? "ring-slate-300/60"
              : "ring-orange-400/60"
        }
      />

      <div
        className={`relative mt-4 w-full overflow-hidden rounded-2xl border border-white/10 bg-card/80 p-5 backdrop-blur-xl ${
          isFirst ? "min-h-[240px] sm:min-h-[260px] shadow-[0_0_40px_-8px_rgba(251,191,36,0.25)]" : "min-h-[220px] sm:min-h-[240px]"
        }`}
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.bar}`}
          aria-hidden
        />

        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-muted">
          {accent.label} Place
        </p>

        <h3
          className={`mt-3 font-bold leading-tight text-foreground ${
            isFirst ? "text-xl sm:text-2xl" : "text-lg"
          }`}
        >
          {entry.displayName}
        </h3>

        <p className="mt-1 text-sm text-muted">{entry.school}</p>
        <p className="mt-0.5 text-xs text-muted/80">{formatGrade(entry.grade)}</p>

        <div className="mt-4 flex justify-center">
          <LevelBadge level={entry.level} size={isFirst ? "lg" : "md"} />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">XP</p>
            <p className="mt-1 font-mono text-lg font-bold text-accent-soft">
              {formatXp(entry.xp)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Shots</p>
            <p className="mt-1 font-mono text-lg font-bold text-foreground">
              {formatShots(entry.totalShots)}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`mt-3 w-full rounded-t-xl bg-gradient-to-t ${accent.bar} opacity-90 ${
          isFirst ? "h-20" : entry.rank === 2 ? "h-10" : "h-12"
        }`}
        aria-hidden
      />
    </article>
  );
}

export function LeaderboardPodium({ entries }: LeaderboardPodiumProps) {
  const podium = entries.slice(0, 3);
  if (podium.length === 0) return null;

  return (
    <section aria-label="Top three athletes" className="mb-12">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-end sm:gap-4">
        {podium.map((entry) => (
          <PodiumCard key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
