import Link from "next/link";

import { FaqDetailsItem } from "@/components/faq/faq-details-item";
import { CtaLink, FamilyDashboardLink, PageHero, SiteSection } from "@/components/site";
import type { FaqItem } from "@/lib/seo/faq-content";
import { REGISTRATION_FACTS } from "@/lib/seo/program-facts";
import { DAILY_SUBMISSIONS } from "@/lib/registration";

type FaqPageViewProps = {
  items: FaqItem[];
};

/**
 * Accessible FAQ accordion — closed by default; native details/summary
 * for keyboard support without a new UI library. Hash deep links
 * (`/faq#video-feedback`) open the matching item on the client.
 */
export function FaqPageView({ items }: FaqPageViewProps) {
  return (
    <div>
      <PageHero
        eyebrow="Program FAQ"
        title="Shooting Challenge questions and answers"
        description={
          <p>
            Fact-based answers about youth basketball training, daily submissions, progress
            tracking, and how families participate — including Fairfield, Montana context and
            supported online program elements.
          </p>
        }
        actions={
          <>
            <CtaLink href="/" variant="contrast" size="default">
              Return to program overview
            </CtaLink>
            <CtaLink href="/game-manual" variant="contrast" size="default">
              Read the game manual
            </CtaLink>
          </>
        }
      />

      <SiteSection
        eyebrow="Common questions"
        title="What families ask"
        titleId="faq-heading"
        aria-labelledby="faq-heading"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {items.map((item) => (
            <FaqDetailsItem key={item.id} item={item} />
          ))}
        </div>
      </SiteSection>

      <SiteSection
        tone="muted"
        eyebrow="Get started"
        title="Registration and daily submissions"
        titleId="faq-registration-heading"
        description="Use the official forms to enroll or log today's shooting activity."
        aria-labelledby="faq-registration-heading"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href={REGISTRATION_FACTS.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-text-link text-sm font-semibold"
          >
            {REGISTRATION_FACTS.cta} (opens registration form)
          </a>
          <Link href="/#registration-gateway" className="sc-text-link text-sm font-semibold">
            View registration section on the homepage
          </Link>
          <FamilyDashboardLink
            testId="family-dashboard-faq-cta"
            variant="outline"
            size="default"
          />
          <a
            href={DAILY_SUBMISSIONS.url}
            target="_blank"
            rel="noopener noreferrer"
            className="sc-text-link text-sm font-semibold"
          >
            {DAILY_SUBMISSIONS.cta} (opens daily submission form)
          </a>
        </div>
      </SiteSection>
    </div>
  );
}
