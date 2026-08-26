import {
  formatGameLogDisplayDate,
  formatGameLogPresentation,
} from "@/lib/data/game-log-presentation";
import { formatXp } from "@/lib/formatters";
import type { XpEventSummary } from "@/types/xp";

type XpActivityTableProps = {
  rows: XpEventSummary[];
  warning?: string;
  emptyMessage?: string;
  totalAvailableRows?: number;
};

export function XpActivityTable({
  rows,
  warning,
  emptyMessage = "No XP events to show yet.",
  totalAvailableRows,
}: XpActivityTableProps) {
  const total = totalAvailableRows ?? rows.length;
  const truncated = total > rows.length;
  return (
    <section aria-labelledby="xp-activity-heading" data-testid="xp-activity-table">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">XP ledger</p>
      <h2 id="xp-activity-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        XP activity
      </h2>

      {warning ? (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {warning}
        </p>
      ) : null}

      {truncated ? (
        <p className="mt-3 text-xs text-muted" data-testid="xp-activity-truncation-notice">
          Showing {rows.length} of {total} XP events (dashboard cap). Open dashboard preview for
          the full ledger (up to 100 rows).
        </p>
      ) : null}

      {rows.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-border border border-border bg-card">
          {rows.map((row) => {
            const headline = formatGameLogPresentation(row).headline;
            return (
              <li
                key={row.id}
                className="px-4 py-3 sm:px-5"
                data-testid="xp-activity-row"
              >
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem_minmax(4.5rem,auto)] items-baseline gap-x-3 gap-y-0.5"
                  data-testid="xp-activity-event-grid"
                >
                  <p className="col-start-1 row-start-1 min-w-0 break-words text-sm font-semibold text-foreground">
                    {headline}
                  </p>
                  <span
                    aria-hidden="true"
                    className="col-start-2 row-start-1"
                    data-testid="xp-activity-middle"
                  />
                  <p className="col-start-3 row-start-1 whitespace-nowrap text-right font-mono text-sm font-bold text-brand-blue">
                    +{formatXp(row.points)} XP
                  </p>
                  <p
                    className="col-start-1 row-start-2 min-w-0 break-words text-xs text-muted"
                    data-testid="xp-activity-date"
                  >
                    {formatGameLogDisplayDate(row.activityDate)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
