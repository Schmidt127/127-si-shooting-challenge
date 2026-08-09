import type { Metadata } from "next";

import {
  HomeworkCatalogView,
  HomeworkEmptyState,
  HomeworkErrorState,
} from "@/components/homework/homework-catalog-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchScheduledHomeworkCatalog } from "@/lib/airtable/homework-queries";

export const metadata: Metadata = {
  title: "Homework",
  description:
    "Current Shooting Challenge homework assignments — scheduled from the active program and published curriculum.",
};

/** ISR: refresh homework assignments every 5 minutes. */
export const revalidate = 300;

export default async function HomeworkPage() {
  try {
    const data = await fetchScheduledHomeworkCatalog();

    if (data.totalAssignments === 0) {
      return <HomeworkEmptyState />;
    }

    return <HomeworkCatalogView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <HomeworkErrorState message={message} />;
  }
}
