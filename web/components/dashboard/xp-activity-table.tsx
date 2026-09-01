import {
  ScCardList,
  ScCardRowItem,
  ScCardSectionHeader,
  scCardEmpty,
} from "@/components/ui/sc-card";
import {
  formatGameLogDateLine,
  formatGameLogDisplayDate,
  formatGameLogPresentation,
} from "@/lib/data/game-log-presentation";
import { formatXp } from "@/lib/formatters";
import { cn } from "@/lib/utils";
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
      <ScCardSectionHeader eyebrow="XP ledger" title="XP activity" titleId="xp-activity-heading" />

      {warning ? (
        <p className="mt-3 rounded-[var(--sc-card-radius)] border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
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
        <p className={cn(scCardEmpty(), "mt-4")}>{emptyMessage}</p>
      ) : (
        <ScCardList>
          {rows.map((row) => {
            const presentation = formatGameLogPresentation(row);
            const displayDate = formatGameLogDisplayDate(row.activityDate);
            return (
              <ScCardRowItem key={row.id} testId="xp-activity-row">
                <div
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_2.5rem_minmax(4.5rem,auto)] items-baseline gap-x-3 gap-y-0.5"
                  data-testid="xp-activity-event-grid"
                >
                  <p className="col-start-1 row-start-1 min-w-0 break-words text-sm font-semibold text-foreground">
                    {presentation.headline}
                  </p>
                  <span
                    aria-hidden="true"
                    className="col-start-2 row-start-1"
                    data-testid="xp-activity-middle"
                  />
                  <p className="col-start-3 row-start-1 whitespace-nowrap text-right font-mono text-sm font-bold text-brand-blue">
                    +{formatXp(row.points)} XP
                  </p>
                  {presentation.dateOnSecondRowRight ? (
                    <>
                      <p
                        className="col-start-1 row-start-2 min-w-0 break-words text-xs text-muted"
                        data-testid="xp-activity-subline"
                      >
                        {presentation.subline}
                      </p>
                      <span
                        aria-hidden="true"
                        className="col-start-2 row-start-2"
                        data-testid="xp-activity-middle-row-2"
                      />
                      <p
                        className="col-start-3 row-start-2 whitespace-nowrap text-right text-xs text-muted"
                        data-testid="xp-activity-date"
                      >
                        {displayDate}
                      </p>
                    </>
                  ) : (
                    <p
                      className="col-start-1 row-start-2 min-w-0 break-words text-xs text-muted"
                      data-testid="xp-activity-date"
                    >
                      {formatGameLogDateLine(row.activityDate, presentation.dateTagline)}
                    </p>
                  )}
                </div>
              </ScCardRowItem>
            );
          })}
        </ScCardList>
      )}
    </section>
  );
}
