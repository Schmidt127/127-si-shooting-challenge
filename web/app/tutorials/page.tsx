import type { Metadata } from "next";

import {
  TutorialsEmptyState,
  TutorialsErrorState,
  TutorialsGridView,
} from "@/components/tutorials/tutorials-grid-view";
import { fetchTutorialCatalog } from "@/lib/airtable/queries";

export const metadata: Metadata = {
  title: "Tutorials",
  description: "Shooting Challenge tutorials — technique, film study, and athlete features.",
};

export const revalidate = 300;

export default async function TutorialsPage() {
  try {
    const data = await fetchTutorialCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialsEmptyState />;
    }

    return <TutorialsGridView data={data} />;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred while fetching data.";
    return <TutorialsErrorState message={message} />;
  }
}
