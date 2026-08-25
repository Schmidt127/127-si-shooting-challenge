import { StatusBadge } from "@/components/ui/status-badge";
import type { PublicWeeklySummary } from "@/types/public-athlete-profile";

type PerfectWeekPanelProps = {
  weeks: PublicWeeklySummary[];
};

function statusTone(
  label: PublicWeeklySummary["perfectWeekStatusLabel"],
): "success" | "warn" | "neutral" {
  if (label === "Perfect Week") return "success";
  if (label === "In Progress") return "warn";
  return "neutral";
}

function formatCount(value: number | null, label: string): string {
  if (value == null) return `${label}: —`;
  return `${label}: ${value}`;
}

function homeworkLine(week: PublicWeeklySummary): string {
  if (week.homeworkStatus) return week.homeworkStatus;
  if (week.homeworkCompleted === true) return "Homework complete";
  if (week.homeworkCompleted === false) return "Homework incomplete";
  return "Homework: —";
}

function zoomLine(week: PublicWeeklySummary): string {
  return week.zoomStatus?.trim() || "Zoom: —";
}

export function PerfectWeekPanel({ weeks }: PerfectWeekPanelProps) {
  return (
    <section aria-labelledby="perfect-week-heading" data-testid="perfect-week-panel">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Perfect week</p>
      <h2 id="perfect-week-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Week-by-week progress
      </h2>
      <p className="mt-2 text-sm text-muted">
        Shot days, homework, videos, and Zoom — every current and past challenge week.
      </p>

      {weeks.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          Perfect Week tracking appears after the first challenge week begins.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-border border border-border bg-card">
          {weeks.map((week) => (
            <li
              key={week.key}
              className="px-4 py-4 sm:px-5"
              data-testid="perfect-week-row"
              data-week-label={week.weekLabel}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{week.weekLabel}</p>
                  {week.weekDateRange ? (
                    <p className="mt-0.5 text-xs text-muted">{week.weekDateRange}</p>
                  ) : null}
                </div>
                <StatusBadge tone={statusTone(week.perfectWeekStatusLabel)}>
                  {week.perfectWeekStatusLabel}
                </StatusBadge>
              </div>

              <ul className="mt-3 grid gap-1.5 text-sm text-foreground/90 sm:grid-cols-2">
                <li>{formatCount(week.daysLogged, "Shot submission days")}</li>
                <li>{formatCount(week.videoCount, "Videos submitted")}</li>
                <li>{homeworkLine(week)}</li>
                <li>{zoomLine(week)}</li>
              </ul>

              {week.perfectWeekStatusLabel === "Not Perfect" ? (
                <p className="mt-3 text-xs text-muted">
                  Keep building next week — every requirement counts toward Perfect Week credit.
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
