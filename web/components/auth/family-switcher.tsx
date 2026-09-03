import { withBasePath } from "@/lib/app-config";
import { cn } from "@/lib/utils";

export type FamilySwitcherItem = {
  displayName: string;
  programLabel: string;
  seasonLabel: string;
  selectionToken: string;
  active: boolean;
};

type FamilySwitcherProps = {
  items: FamilySwitcherItem[];
  /** Compact chip row for dashboard chrome vs full list on select page. */
  variant?: "chips" | "list";
};

/**
 * Switch / select child via POST — opaque tokens only; never enrollment IDs in URLs.
 * Native form posts so the browser follows the select-child redirect cleanly.
 */
export function FamilySwitcher({ items, variant = "chips" }: FamilySwitcherProps) {
  const action = withBasePath("/api/auth/select-child");

  if (variant === "list") {
    return (
      <ul className="grid gap-3" data-testid="dashboard-child-select-list">
        {items.map((item) => (
          <li key={`${item.displayName}-${item.programLabel}-${item.seasonLabel}`}>
            <form action={action} method="post">
              <input type="hidden" name="selectionToken" value={item.selectionToken} />
              <button
                type="submit"
                className={cn(
                  "flex w-full min-h-14 flex-col items-start gap-1 rounded-xl border px-5 py-4 text-left transition-colors",
                  "border-border bg-card hover:border-brand-blue/40",
                  item.active && "border-brand-blue bg-brand-blue/5",
                )}
                data-testid="dashboard-child-select-option"
              >
                <span className="text-base font-semibold text-foreground">{item.displayName}</span>
                <span className="text-sm text-muted">
                  {item.programLabel} · {item.seasonLabel}
                </span>
                <span className="mt-2 text-sm font-semibold text-brand-blue">Open dashboard</span>
              </button>
            </form>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2" data-testid="dashboard-family-switcher-options">
      {items.map((item) =>
        item.active ? (
          <span
            key={`${item.displayName}-${item.programLabel}-${item.seasonLabel}`}
            className="min-h-10 rounded-full border border-brand-blue bg-brand-blue px-4 py-2 text-sm font-semibold text-white"
            aria-current="page"
          >
            {item.displayName}
          </span>
        ) : (
          <form
            key={`${item.displayName}-${item.programLabel}-${item.seasonLabel}`}
            action={action}
            method="post"
          >
            <input type="hidden" name="selectionToken" value={item.selectionToken} />
            <button
              type="submit"
              className="min-h-10 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-brand-blue/40"
            >
              {item.displayName}
            </button>
          </form>
        ),
      )}
    </div>
  );
}
