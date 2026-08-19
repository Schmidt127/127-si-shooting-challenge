import {
  TutorialMediaEmptyState,
  TutorialMediaErrorState,
  TutorialMediaGridView,
} from "@/components/tutorial-media/tutorial-media-views";
import { TUTORIALS_SECTION } from "@/lib/tutorial-media/config";
import type { TutorialCatalogData } from "@/types/tutorials";

export function TutorialsGridView({ data }: { data: TutorialCatalogData }) {
  return <TutorialMediaGridView data={data} config={TUTORIALS_SECTION} />;
}

export function TutorialsEmptyState() {
  return <TutorialMediaEmptyState config={TUTORIALS_SECTION} />;
}

export function TutorialsErrorState({ message }: { message: string }) {
  return <TutorialMediaErrorState config={TUTORIALS_SECTION} message={message} />;
}
