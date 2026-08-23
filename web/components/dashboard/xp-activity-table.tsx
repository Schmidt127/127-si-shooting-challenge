import { formatXp, formatXpSourceLabel } from "@/lib/formatters";
import type { XpEventSummary } from "@/types/xp";

type XpActivityTableProps = {
  rows: XpEventSummary[];
  warning?: string;
  emptyMessage?: string;
};

export function XpActivityTable({
  rows,
  warning,
  emptyMessage = "No XP events to show yet.",
}: XpActivityTableProps) {
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

      {rows.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          {emptyMessage}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto border border-border bg-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-brand-light-gray/60 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              <tr>
                <th scope="col" className="px-4 py-3">
                  Date
                </th>
                <th scope="col" className="px-4 py-3">
                  Source
                </th>
                <th scope="col" className="px-4 py-3">
                  Reason
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  XP
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0" data-testid="xp-activity-row">
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{row.activityDate ?? "—"}</td>
                  <td className="px-4 py-3 font-semibold text-foreground">
                    {formatXpSourceLabel(row.sourceLabel)}
                  </td>
                  <td className="px-4 py-3 text-muted">{row.reasonPublic || "XP awarded"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-mono font-bold text-brand-blue">
                    +{formatXp(row.points)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
