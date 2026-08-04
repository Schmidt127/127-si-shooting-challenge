import { formatShots, formatXp } from "@/lib/formatters";
import type { PublicActivityItem } from "@/types/public-athlete-profile";

type RecentActivityLogProps = {
  items: PublicActivityItem[];
};

export function RecentActivityLog({ items }: RecentActivityLogProps) {
  return (
    <section aria-labelledby="activity-heading" data-testid="recent-activity">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-blue">Game log</p>
      <h2 id="activity-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Recent activity
      </h2>

      {items.length === 0 ? (
        <p className="mt-4 border border-dashed border-border bg-brand-light-gray/50 px-4 py-5 text-sm text-muted">
          No approved public activity yet. First counted submissions will appear here.
        </p>
      ) : (
        <ol className="mt-5 divide-y divide-border border border-border bg-card">
          {items.map((item) => (
            <li key={item.key} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {item.date ?? "Date TBD"}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
              <div className="font-mono text-sm font-bold text-accent-soft">
                {item.xp != null
                  ? `+${formatXp(item.xp)} XP`
                  : item.shots != null
                    ? `${formatShots(item.shots)} shots`
                    : "—"}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
