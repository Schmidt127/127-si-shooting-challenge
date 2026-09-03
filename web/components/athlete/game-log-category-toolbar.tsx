"use client";

import { cn } from "@/lib/utils";
import type { GameLogCategoryId, GameLogCategoryOption } from "@/lib/data/game-log-categories";

export type GameLogFilterSelection = GameLogCategoryId | "all";

type GameLogCategoryToolbarProps = {
  options: readonly GameLogCategoryOption[];
  value: GameLogFilterSelection;
  onChange: (value: GameLogFilterSelection) => void;
  /** Accessible name for the toolbar. */
  ariaLabel: string;
  testId?: string;
};

/**
 * Shared category chip toolbar for public Game Log + private XP activity.
 * Avoids pill-heavy marketing chrome: compact bordered chips, brand orange when selected.
 */
export function GameLogCategoryToolbar({
  options,
  value,
  onChange,
  ariaLabel,
  testId = "game-log-category-toolbar",
}: GameLogCategoryToolbarProps) {
  const chips: Array<{ id: GameLogFilterSelection; label: string }> = [
    { id: "all", label: "All" },
    ...options.map((option) => ({ id: option.id, label: option.label })),
  ];

  return (
    <div
      className="-mx-1 flex max-w-full gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
      role="toolbar"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {chips.map((chip) => {
        const selected = value === chip.id;
        return (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange(chip.id)}
            className={cn(
              "min-h-10 shrink-0 rounded-md border px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              selected
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-border bg-card text-muted hover:border-brand-orange/40 hover:text-foreground",
            )}
            aria-pressed={selected}
            data-testid={`game-log-filter-${chip.id}`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
