import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteSection } from "@/components/site";
import { formatUsd, type ProgramPricing } from "@/lib/data/program-pricing";
import { cn } from "@/lib/utils";

function formatDeadline(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Denver",
  }).format(date);
}

function PriceRow({
  label,
  amount,
  deadline,
}: {
  label: string;
  amount?: number;
  deadline?: string;
}) {
  const price = formatUsd(amount);
  if (!price) return null;
  const until = formatDeadline(deadline);

  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-3 last:border-b-0">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {until ? (
          <p className="mt-0.5 text-xs text-muted-foreground">Through {until}</p>
        ) : null}
      </div>
      <p className="font-mono text-base font-bold text-foreground">{price}</p>
    </div>
  );
}

export function ProgramPricingSection({ pricing }: { pricing: ProgramPricing | null }) {
  if (!pricing) return null;

  const from = formatUsd(pricing.priceFrom);

  return (
    <SiteSection
      id="pricing"
      data-testid="program-pricing"
      tone="muted"
      eyebrow="Registration"
      title="Program cost and what is included"
      titleId="pricing-heading"
      description={
        from
          ? `Current published pricing for ${pricing.programName}. Starting at ${from}.`
          : `Current published pricing for ${pricing.programName}.`
      }
      aria-labelledby="pricing-heading"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="rounded-lg shadow-site-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">Price tiers</CardTitle>
            <CardDescription>
              Published registration pricing for this challenge season. Register through the
              official player registration form to pay.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <PriceRow
              label="Early bird"
              amount={pricing.priceEarlyBird}
              deadline={pricing.deadlineEarlyBird}
            />
            <PriceRow
              label="Regular"
              amount={pricing.priceRegular}
              deadline={pricing.deadlineRegular}
            />
            <PriceRow label="Late" amount={pricing.priceLate} />
            <a
              href={pricing.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Register for the Challenge (opens in a new tab)"
              className={cn(
                buttonVariants({ variant: "cta", size: "default" }),
                "mt-5 min-h-11 w-full justify-center sm:w-auto",
              )}
            >
              Register for the Challenge
              <span aria-hidden className="ml-0.5 text-xs font-bold opacity-80">
                ↗
              </span>
            </a>
          </CardContent>
        </Card>

        <Card className="rounded-lg shadow-site-sm">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">What is included</CardTitle>
            <CardDescription>
              One registration covers the season resources listed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-3">
              {pricing.whatIsIncluded.map((item) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-foreground">
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-orange"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </SiteSection>
  );
}
