import { LoadingState } from "@/components/ui";
import { LOADING_LABELS } from "@/lib/release/public-surface";

export default function ZoomMeetingsLoading() {
  return <LoadingState label={LOADING_LABELS.zoom} />;
}
