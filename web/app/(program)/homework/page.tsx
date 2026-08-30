import type { Metadata } from "next";

import {
  HomeworkCatalogView,
  HomeworkEmptyState,
  HomeworkErrorState,
} from "@/components/homework/homework-catalog-view";
import { CatalogStructuredData } from "@/components/seo/catalog-structured-data";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchScheduledHomeworkCatalog } from "@/lib/airtable/homework-queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Weekly Homework — Youth Basketball Training",
  description:
    "Published Shooting Challenge homework assignments for youth basketball skill development — weekly curriculum, due dates, and training expectations.",
  path: "/homework",
});

/** ISR: refresh homework assignments every 5 minutes. */
export const revalidate = 300;

export default async function HomeworkPage() {
  const structuredData = <CatalogStructuredData section="homework" />;

  try {
    const data = await fetchScheduledHomeworkCatalog();

    if (data.totalAssignments === 0) {
      return (
        <>
          {structuredData}
          <HomeworkEmptyState />
        </>
      );
    }

    return (
      <>
        {structuredData}
        <HomeworkCatalogView data={data} />
      </>
    );
  } catch (error) {
    const message = publicErrorMessage(error);
    return (
      <>
        {structuredData}
        <HomeworkErrorState message={message} />
      </>
    );
  }
}
