import type { PublicAthleteAward } from "@/types/public-athlete-profile";

type PublicAwardsSectionProps = {
  awards: PublicAthleteAward[];
};

/**
 * Public athlete awards — only items already filtered to Public On Web = true.
 * Never render amount, status, email, or Airtable ids.
 */
export function PublicAwardsSection({ awards }: PublicAwardsSectionProps) {
  if (awards.length === 0) return null;

  return (
    <section aria-labelledby="public-awards-heading" className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Recognition</p>
        <h2 id="public-awards-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
          Season awards
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Awards the family chose to share on this public profile.
        </p>
      </div>
      <ul className="divide-y divide-border border-y border-border">
        {awards.map((award) => (
          <li key={award.key} className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{award.awardName}</p>
              {award.description ? (
                <p className="mt-1 text-sm text-muted">{award.description}</p>
              ) : null}
            </div>
            <div className="shrink-0 text-sm text-muted sm:text-right">
              {award.scopeLabel ? <p>{award.scopeLabel}</p> : null}
              {award.awardDate ? <p className="font-mono text-xs">{award.awardDate}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
