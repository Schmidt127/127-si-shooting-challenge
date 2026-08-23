import { XpActivityTable } from "@/components/athlete/xp-activity-table";
import { ErrorState } from "@/components/ui";
import { loadXpActivityPageResult } from "@/lib/data/xp-activity-page";

type XpActivitySectionProps = {
  slug: string;
};

export async function XpActivitySection({ slug }: XpActivitySectionProps) {
  const result = await loadXpActivityPageResult(slug, null);

  if (result.status === "not_found") {
    return null;
  }

  if (result.status === "error") {
    return (
      <ErrorState
        title="XP activity unavailable"
        message={result.message}
        data-testid="xp-activity-error"
      />
    );
  }

  return <XpActivityTable slug={slug} initialPage={result.data} />;
}

export function XpActivitySkeleton() {
  return (
    <section aria-busy="true" data-testid="xp-activity-skeleton" className="animate-pulse">
      <div className="h-4 w-24 rounded bg-brand-light-gray" />
      <div className="mt-2 h-7 w-48 rounded bg-brand-light-gray" />
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="h-11 rounded bg-brand-light-gray" />
        <div className="h-11 rounded bg-brand-light-gray" />
        <div className="h-11 rounded bg-brand-light-gray" />
      </div>
      <div className="mt-4 space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-14 rounded border border-border bg-card" />
        ))}
      </div>
    </section>
  );
}
