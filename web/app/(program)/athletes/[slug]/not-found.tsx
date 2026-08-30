import Link from "next/link";

import { AmbientPage } from "@/components/catalog/ambient-page";
import { SiteContainer } from "@/components/site/site-container";
import { EmptyState } from "@/components/ui";

export default function AthleteProfileNotFound() {
  return (
    <AmbientPage variant="default">
      <SiteContainer className="py-16">
        <EmptyState
          title="Athlete profile not found"
          description="This public profile is unavailable. It may be private, or the link may be incorrect."
          titleAs="h1"
          action={
            <Link
              href="/leaderboard"
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand-blue px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange"
            >
              Back to standings
            </Link>
          }
        />
      </SiteContainer>
    </AmbientPage>
  );
}
