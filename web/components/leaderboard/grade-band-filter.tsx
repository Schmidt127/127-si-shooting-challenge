"use client";

import { ALL_GRADE_BANDS_ID, type GradeBandOption } from "@/lib/data/grade-bands";
import { ACCESSIBILITY_LABELS } from "@/lib/release/public-surface";
import { cn } from "@/lib/utils";

type GradeBandFilterProps = {
  options: GradeBandOption[];
  value: string;
  onChange: (bandId: string) => void;
  counts?: Record<string, number>;
};

export function GradeBandFilter({ options, value, onChange, counts }: GradeBandFilterProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={ACCESSIBILITY_LABELS.gradeBandFilter}
    >
      {options.map((option) => {
        const selected = value === option.id;
        const count = counts?.[option.id];
        const hideEmptyConfigured =
          option.id !== ALL_GRADE_BANDS_ID && (count === 0 || count === undefined) && !selected;

        if (hideEmptyConfigured) return null;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            aria-pressed={selected}
            className={cn(
              "min-h-[2.75rem] rounded-lg border px-3.5 text-xs font-semibold uppercase tracking-[0.14em] transition",
              selected
                ? "border-brand-orange/50 bg-brand-orange/15 text-accent-soft"
                : "border-border bg-brand-light-gray text-muted hover:border-brand-medium-gray hover:text-foreground",
            )}
          >
            <span className="sm:hidden">{option.shortLabel}</span>
            <span className="hidden sm:inline">{option.label}</span>
            {typeof count === "number" ? (
              <span className="ml-2 font-mono text-[10px] opacity-80">{count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
