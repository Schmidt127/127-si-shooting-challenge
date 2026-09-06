"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

import { GradeBandFilter } from "@/components/leaderboard/grade-band-filter";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { withBasePath } from "@/lib/app-config";
import {
  ALL_GRADE_BANDS_ID,
  countEntriesByGradeBand,
  filterByGradeBand,
  resolveSelectedGradeBandId,
  withFilteredRanks,
  type GradeBandOption,
} from "@/lib/data/grade-bands";
import type { LeaderboardEntry } from "@/types/leaderboard";

type LeaderboardBoardProps = {
  entries: LeaderboardEntry[];
  gradeBandOptions: GradeBandOption[];
  /** Resolved band id from the server (stale query already mapped to `all`). */
  initialBandId?: string;
};

function syncBandQuery(pathname: string, bandId: string) {
  const base = withBasePath(pathname || "/leaderboard");
  const href =
    !bandId || bandId === ALL_GRADE_BANDS_ID
      ? base
      : `${base}?band=${encodeURIComponent(bandId)}`;
  window.history.replaceState(null, "", href);
}

export function LeaderboardBoard({
  entries,
  gradeBandOptions,
  initialBandId = ALL_GRADE_BANDS_ID,
}: LeaderboardBoardProps) {
  const pathname = usePathname();
  const options =
    gradeBandOptions.length > 0
      ? gradeBandOptions
      : [{ id: ALL_GRADE_BANDS_ID, label: "All Grade Bands", shortLabel: "All", minGrade: null, maxGrade: null, sortOrder: 0 }];

  const [band, setBand] = useState(() =>
    resolveSelectedGradeBandId(initialBandId, options),
  );

  const counts = useMemo(() => countEntriesByGradeBand(entries, options), [entries, options]);

  const filtered = useMemo(
    () => withFilteredRanks(filterByGradeBand(entries, band)),
    [entries, band],
  );

  const onChange = useCallback(
    (next: string) => {
      const resolved = resolveSelectedGradeBandId(next, options);
      setBand(resolved);
      syncBandQuery(pathname, resolved);
    },
    [options, pathname],
  );

  return (
    <div>
      <div className="mb-8 rounded-2xl border border-border bg-brand-light-gray p-4 backdrop-blur-sm sm:p-5">
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
        <GradeBandFilter value={band} onChange={onChange} counts={counts} options={options} />
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card/60 px-6 py-12 text-center text-sm text-muted">
          No athletes in this grade band yet.
        </p>
      ) : (
        <LeaderboardTable
          entries={filtered}
          skipFirst={0}
          heading={band === ALL_GRADE_BANDS_ID ? "Full rankings" : "Band rankings"}
        />
      )}
    </div>
  );
}
