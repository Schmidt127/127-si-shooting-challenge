"use client";

import {
  GAME_LOG_CATEGORY_OPTIONS,
  type GameLogCategoryId,
} from "@/lib/data/game-log-categories";
import { cn } from "@/lib/utils";

type GameLogCategoryFilterProps = {
  value: GameLogCategoryId | null;
  onChange: (category: GameLogCategoryId | null) => void;
  /** Optional aria label override. */
  ariaLabel?: string;
};

export function GameLogCategoryFilter({
  value,
  onChange,
  ariaLabel = "Filter game log by category",
}: GameLogCategoryFilterProps) {
  return (
    <div
      className="mt-3 flex flex-wrap gap-2"
      role="group"
      aria-label={ariaLabel}
      data-testid="game-log-category-filter"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        data-testid="game-log-category-all"
        className={cn(
          "min-h-[2.5rem] rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
          value === null
            ? "border-brand-orange/50 bg-brand-orange/15 text-accent-soft"
            : "border-border bg-brand-light-gray text-muted hover:border-brand-medium-gray hover:text-foreground",
        )}
      >
        All
      </button>
      {GAME_LOG_CATEGORY_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            data-testid={`game-log-category-${option.id}`}
            className={cn(
              "min-h-[2.5rem] rounded-lg border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition",
              selected
                ? "border-brand-orange/50 bg-brand-orange/15 text-accent-soft"
                : "border-border bg-brand-light-gray text-muted hover:border-brand-medium-gray hover:text-foreground",
            )}
          >
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
