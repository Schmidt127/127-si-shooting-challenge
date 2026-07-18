import { LoadingState } from "@/components/ui";
import { LOADING_LABELS } from "@/lib/release/public-surface";

export default function AchievementsLoading() {
  return <LoadingState label={LOADING_LABELS.achievements} />;
}
