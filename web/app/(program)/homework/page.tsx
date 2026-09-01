import type { Metadata } from "next";

import {
  HomeworkCatalogView,
  HomeworkEmptyState,
  HomeworkErrorState,
} from "@/components/homework/homework-catalog-view";
import { publicHomeworkErrorMessage } from "@/lib/airtable/homework-load-errors";
import { loadHomeworkCatalog } from "@/lib/airtable/homework-queries";
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
  const result = await loadHomeworkCatalog();

  if (result.status === "error") {
    return (
      <HomeworkErrorState
        message={publicHomeworkErrorMessage(result.error)}
        retryable={result.error.retryable}
      />
    );
  }

  if (result.status === "empty" || result.data.totalAssignments === 0) {
    return <HomeworkEmptyState />;
  }

  return <HomeworkCatalogView data={result.data} />;
}
