import { IconBolt, IconTarget } from "@/components/icons/shoot-icons";
import { formatGrade, formatShots, formatXp } from "@/lib/formatters";
import type { LeaderboardEntry } from "@/types/leaderboard";

import { AthleteAvatar } from "./athlete-avatar";
import { LevelBadge } from "./level-badge";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  /**
   * Skip athletes already shown on the podium.
   * Default 3 for full-board layouts; pass 0 when no podium is rendered.
   */
  skipFirst?: number;
  heading?: string;
};

function RankCell({ rank }: { rank: number }) {
  const isTopTen = rank <= 10;

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${
        isTopTen
          ? "bg-accent/15 text-accent-soft ring-1 ring-accent/30"
          : "bg-brand-light-gray text-muted ring-1 ring-border"
      }`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardTable({
  entries,
  skipFirst = 3,
  heading = "Full Rankings",
}: LeaderboardTableProps) {
  const rest = entries.slice(Math.max(0, skipFirst));
  if (rest.length === 0) return null;

  return (
    <section aria-label="Full rankings">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{heading}</h2>
          <p className="mt-1 text-sm text-muted">Sorted by level, then XP, then total shots</p>
        </div>
        <p className="hidden text-xs uppercase tracking-widest text-muted sm:block">
          {rest.length} athletes
        </p>
      </div>

      <div className="sc-table-scroll hidden overflow-hidden rounded-2xl border border-border md:block">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Athlete</th>
              <th>School</th>
              <th>Grade</th>
              <th>Level</th>
              <th data-align="right">
                <span className="inline-flex items-center justify-end gap-1">
                  <IconBolt size={14} /> XP
                </span>
              </th>
              <th data-align="right">
                <span className="inline-flex items-center justify-end gap-1">
                  <IconTarget size={14} /> Shots
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rest.map((entry) => (
              <tr key={entry.id} className="transition-colors hover:bg-brand-light-gray">
                <td>
                  <RankCell rank={entry.rank} />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <AthleteAvatar
                      name={entry.displayName}
                      headshotUrl={entry.headshot?.url}
                      size="sm"
                    />
                    <span className="font-semibold text-foreground">{entry.displayName}</span>
                  </div>
                </td>
                <td className="text-muted">{entry.school}</td>
                <td className="text-muted">{formatGrade(entry.grade)}</td>
                <td>
                  <LevelBadge level={entry.level} size="sm" />
                </td>
                <td data-align="right" className="text-base font-bold text-accent-soft">
                  {formatXp(entry.xp)}
                </td>
                <td data-align="right" className="text-foreground">
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
            className="rounded-2xl border border-border bg-card/70 p-4 backdrop-blur-xl"
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

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-brand-light-gray p-3">
              <div>
                <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <IconBolt size={12} className="text-brand-orange" /> XP
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-accent-soft">
                  {formatXp(entry.xp)}
                </p>
              </div>
              <div className="text-right">
                <p className="flex items-center justify-end gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted">
                  <IconTarget size={12} className="text-muted" /> Shots
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
