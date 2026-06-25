import type { Metadata } from "next";

import {
  HomeworkCatalogView,
  HomeworkEmptyState,
  HomeworkErrorState,
} from "@/components/homework/homework-catalog-view";
import { fetchHomeworkCatalog } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Homework",
  description:
    "Published shooting challenge homework assignments — film study, faith, and basketball curriculum by week.",
};

/** ISR: refresh homework catalog every 5 minutes. */
export const revalidate = 300;

export default async function HomeworkPage() {
  try {
    const data = await fetchHomeworkCatalog();

    if (data.totalAssignments === 0) {
      return <HomeworkEmptyState />;
    }

    return <HomeworkCatalogView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <HomeworkErrorState message={message} />;
  }
}
