"use client";

import { useMemo, useState } from "react";

import { GradeBandFilter } from "@/components/leaderboard/grade-band-filter";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import {
  filterByGradeBand,
  gradeToBand,
  withFilteredRanks,
  type GradeBandId,
} from "@/lib/data/grade-bands";
import type { LeaderboardEntry } from "@/types/leaderboard";

type LeaderboardBoardProps = {
  entries: LeaderboardEntry[];
};

export function LeaderboardBoard({ entries }: LeaderboardBoardProps) {
  const [band, setBand] = useState<GradeBandId>("all");

  const counts = useMemo(() => {
    const next: Partial<Record<GradeBandId, number>> = {
      all: entries.length,
      elementary: 0,
      middle: 0,
      high: 0,
      other: 0,
    };
    for (const entry of entries) {
      const id = gradeToBand(entry.grade);
      next[id] = (next[id] ?? 0) + 1;
    }
    return next;
  }, [entries]);

  const filtered = useMemo(
    () => withFilteredRanks(filterByGradeBand(entries, band)),
    [entries, band],
  );

  const showPodium = filtered.length >= 3;

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted">
              Grade band
            </p>
            <p className="mt-1 text-sm text-muted">
              Filter rankings without leaving the season board
            </p>
          </div>
          <p className="font-mono text-xs text-muted">
            Showing {filtered.length} of {entries.length}
          </p>
        </div>
        <GradeBandFilter value={band} onChange={setBand} counts={counts} />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-card/60 px-6 py-12 text-center text-sm text-muted">
          No athletes in this grade band yet.
        </p>
      ) : (
        <>
          {showPodium ? <LeaderboardPodium entries={filtered} /> : null}

          {showPodium && filtered.length > 3 ? (
            <div className="mt-10">
              <LeaderboardTable entries={filtered} skipFirst={3} />
            </div>
          ) : null}

          {!showPodium ? (
            <LeaderboardTable
              entries={filtered}
              skipFirst={0}
              heading={band === "all" ? "Rankings" : "Band rankings"}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
