import type { Metadata } from "next";

import { HomePageView } from "@/components/home/home-page-view";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchRegisteringProgramPricing } from "@/lib/data/program-pricing";
import { PLAYER_REGISTRATION } from "@/lib/registration";
import { buildPageMetadata, buildProgramHomeJsonLd } from "@/lib/seo/metadata";
import { HOME_PAGE_TITLE, SITE_DESCRIPTION } from "@/lib/seo/program-facts";

export const metadata: Metadata = buildPageMetadata({
  title: HOME_PAGE_TITLE,
  titleAbsolute: true,
  description: SITE_DESCRIPTION,
  path: "",
});

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function ShootingChallengeHomePage() {
  const pricing = await fetchRegisteringProgramPricing(300, PLAYER_REGISTRATION.url).catch(
    () => null,
  );

  return (
    <>
      <JsonLd data={buildProgramHomeJsonLd()} />
      <HomePageView pricing={pricing} />
    </>
  );
}
