import { IconBolt, IconTarget } from "@/components/icons/shoot-icons";
import { formatGrade, formatShots, formatXp } from "@/lib/formatters";
import type { LeaderboardEntry } from "@/types/leaderboard";

import { AthleteAvatar } from "./athlete-avatar";
import { LevelBadge } from "./level-badge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
};

function RankCell({ rank }: { rank: number }) {
  const isTopTen = rank <= 10;

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
        isTopTen
          ? "bg-accent/15 text-accent-soft ring-1 ring-accent/30"
          : "bg-white/5 text-muted ring-1 ring-white/10"
      }`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  const rest = entries.slice(3);
  if (rest.length === 0) return null;

  return (
    <section aria-label="Full rankings">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">Full Rankings</h2>
          <p className="mt-1 text-sm text-muted">Sorted by level, then XP, then total shots</p>
        </div>
        <p className="hidden text-xs uppercase tracking-widest text-muted sm:block">
          {rest.length} athletes
        </p>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
              <th className="px-5 py-4">Rank</th>
              <th className="px-5 py-4">Athlete</th>
              <th className="px-5 py-4">School</th>
              <th className="px-5 py-4">Grade</th>
              <th className="px-5 py-4">Level</th>
              <th className="px-5 py-4 text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <IconBolt size={14} className="text-amber-400" /> XP
                </span>
              </th>
              <th className="px-5 py-4 text-right">
                <span className="inline-flex items-center justify-end gap-1">
                  <IconTarget size={14} className="text-cyan-400" /> Shots
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rest.map((entry, index) => (
              <tr
                key={entry.id}
                className={`border-b border-white/5 transition-colors hover:bg-white/[0.04] ${
                  index % 2 === 0 ? "bg-transparent" : "bg-white/[0.015]"
                }`}
              >
                <td className="px-5 py-4">
                  <RankCell rank={entry.rank} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <AthleteAvatar
                      name={entry.displayName}
                      headshotUrl={entry.headshot?.url}
                      size="sm"
                    />
                    <span className="font-semibold text-foreground">{entry.displayName}</span>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-muted">{entry.school}</td>
                <td className="px-5 py-4 text-sm text-muted">{formatGrade(entry.grade)}</td>
                <td className="px-5 py-4">
                  <LevelBadge level={entry.level} size="sm" />
                </td>
                <td className="px-5 py-4 text-right font-mono text-base font-bold text-accent-soft">
                  {formatXp(entry.xp)}
                </td>
                <td className="px-5 py-4 text-right font-mono text-sm text-foreground">
                  {formatShots(entry.totalShots)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rest.map((entry) => (
          <article
            key={entry.id}
            className="rounded-2xl border border-white/10 bg-card/70 p-4 backdrop-blur-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <RankCell rank={entry.rank} />
                <AthleteAvatar
                  name={entry.displayName}
                  headshotUrl={entry.headshot?.url}
                  size="md"
                />
                <div>
                  <h3 className="font-semibold text-foreground">{entry.displayName}</h3>
                  <p className="mt-0.5 text-sm text-muted">{entry.school}</p>
                  <p className="text-xs text-muted/80">{formatGrade(entry.grade)}</p>
                </div>
              </div>
              <LevelBadge level={entry.level} size="sm" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white/[0.03] p-3">
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <IconBolt size={12} className="text-amber-400" /> XP
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-accent-soft">
                  {formatXp(entry.xp)}
                </p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <IconTarget size={12} className="text-cyan-400" /> Shots
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-foreground">
                  {formatShots(entry.totalShots)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
