import type { Metadata } from "next";

import {
  TutorialsEmptyState,
  TutorialsErrorState,
  TutorialsGridView,
} from "@/components/tutorials/tutorials-grid-view";
import { publicErrorMessage } from "@/lib/airtable/errors";
import { fetchTutorialCatalog } from "@/lib/airtable/queries";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Skills and Technique Tutorials",
  description:
    "Skills and Technique Tutorials for the Shooting Challenge — technique clips, film study, and form breakdowns.",
  path: "/tutorials",
});

export const revalidate = 300;

export default async function TutorialsPage() {
  try {
    const data = await fetchTutorialCatalog();

    if (data.totalTutorials === 0) {
      return <TutorialsEmptyState />;
    }

    return <TutorialsGridView data={data} />;
  } catch (error) {
    const message = publicErrorMessage(error);
    return <TutorialsErrorState message={message} />;
  }
}
