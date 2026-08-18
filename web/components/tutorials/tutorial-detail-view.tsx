import {
  TutorialMediaDetailView,
  TutorialMediaNotFoundState,
} from "@/components/tutorial-media/tutorial-media-views";
import { TUTORIALS_SECTION } from "@/lib/tutorial-media/config";
import type { TutorialItem } from "@/types/tutorials";

type TutorialDetailViewProps = {
  tutorial: TutorialItem;
};

export function TutorialDetailView({ tutorial }: TutorialDetailViewProps) {
  return <TutorialMediaDetailView item={tutorial} config={TUTORIALS_SECTION} />;
}

export function TutorialNotFoundState() {
  return <TutorialMediaNotFoundState config={TUTORIALS_SECTION} />;
}
