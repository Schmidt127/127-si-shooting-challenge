import type { Metadata } from "next";

import { FaqPageView } from "@/components/faq/faq-page-view";
import { JsonLd } from "@/components/seo/json-ld";
import { PROGRAM_FAQ_ITEMS } from "@/lib/seo/faq-content";
import { buildFaqRouteJsonLd, buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "FAQ — Youth Basketball Shooting Challenge",
  description:
    "Answers about grades served, Educational Athletics, daily shooting submissions, XP progress tracking, video feedback, Zoom coaching, Fairfield Montana location, and registration.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={buildFaqRouteJsonLd(PROGRAM_FAQ_ITEMS)} />
      <FaqPageView items={PROGRAM_FAQ_ITEMS} />
    </>
  );
}
