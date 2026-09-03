"use client";

import { useMemo, useState } from "react";

import {
  GameLogCategoryToolbar,
  type GameLogFilterSelection,
} from "@/components/athlete/game-log-category-toolbar";
import { XpActivityTable } from "@/components/dashboard/xp-activity-table";
import {
  PRIVATE_GAME_LOG_CATEGORY_OPTIONS,
  filterXpRowsByCategory,
  gameLogCategoryLabel,
  type GameLogCategoryId,
} from "@/lib/data/game-log-categories";
import type { XpEventSummary } from "@/types/xp";

type DashboardXpSectionProps = {
  rows: XpEventSummary[];
  warning?: string;
  totalAvailableRows?: number;
};

export function DashboardXpSection({ rows, warning, totalAvailableRows }: DashboardXpSectionProps) {
  const [filter, setFilter] = useState<GameLogFilterSelection>("all");
  const category: GameLogCategoryId | null = filter === "all" ? null : filter;

  const filteredRows = useMemo(
    () => filterXpRowsByCategory(rows, category),
    [category, rows],
  );

  return (
    <section id="dashboard-xp" className="scroll-mt-24" aria-labelledby="dashboard-xp-heading">
      <GameLogCategoryToolbar
        options={PRIVATE_GAME_LOG_CATEGORY_OPTIONS}
        value={filter}
        onChange={setFilter}
        ariaLabel="Filter XP activity by category"
        testId="private-game-log-category-toolbar"
      />

      <div className="mt-4">
        <XpActivityTable
          rows={filteredRows}
          warning={warning}
          totalAvailableRows={filter === "all" ? totalAvailableRows : filteredRows.length}
          emptyMessage={
            filter === "all"
              ? "No XP events to show yet."
              : `No ${gameLogCategoryLabel(category).toLowerCase()} XP events match this filter yet.`
          }
        />
      </div>
    </section>
  );
}
