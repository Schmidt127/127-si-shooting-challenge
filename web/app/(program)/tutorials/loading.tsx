import { LoadingState } from "@/components/ui";
import { LOADING_LABELS } from "@/lib/release/public-surface";

export default function TutorialsLoading() {
  return <LoadingState label={LOADING_LABELS.tutorials} />;
}
