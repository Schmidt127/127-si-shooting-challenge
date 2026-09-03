import type { PublicSeasonAward } from "@/types/public-athlete-profile";

type PublicAwardsSectionProps = {
  awards: PublicSeasonAward[];
};

function formatAwardDate(iso: string | null): string | null {
  if (!iso) return null;
  const key = iso.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return key;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = months[Number(match[2]) - 1];
  if (!month) return key;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

/**
 * Public season awards — only items that passed Public On Web gating.
 * Never render amounts, parent info, Award Status, or Airtable ids.
 */
export function PublicAwardsSection({ awards }: PublicAwardsSectionProps) {
  if (awards.length === 0) return null;

  return (
    <section aria-labelledby="public-awards-heading" data-testid="public-awards-section">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-orange">
        Recognition
      </p>
      <h2 id="public-awards-heading" className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
        Season awards
      </h2>
      <ul className="mt-5 space-y-3">
        {awards.map((award) => {
          const dateLabel = formatAwardDate(award.awardDate);
          return (
            <li
              key={award.key}
              className="border border-border bg-card px-4 py-4 sm:px-5"
              data-testid="public-award-item"
            >
              <p className="text-base font-bold text-foreground">{award.awardName}</p>
              {(award.scopeLabel || dateLabel) && (
                <p className="mt-1 text-sm text-muted">
                  {[award.scopeLabel, dateLabel].filter(Boolean).join(" · ")}
                </p>
              )}
              {award.description ? (
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{award.description}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
