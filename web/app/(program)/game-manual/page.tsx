import type { Metadata } from "next";

import { GameManualView } from "@/components/game-manual/game-manual-view";
import { getGameManualUrl } from "@/lib/game-manual/config";

export const metadata: Metadata = {
  title: "Game Manual | Shooting Challenge",
  description: "Official rules, scoring, XP, and program reference for the Shooting Challenge.",
};

/** Game Manual — embeds the Adobe-hosted document when configured. */
export default function GameManualPage() {
  return <GameManualView manualUrl={getGameManualUrl()} />;
}
