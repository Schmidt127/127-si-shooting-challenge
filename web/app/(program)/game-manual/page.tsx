import type { Metadata } from "next";

import { GameManualView } from "@/components/game-manual/game-manual-view";
import { fetchLevelLadder, fetchXpRuleCatalog } from "@/lib/airtable/queries";
import { getGameManualUrl } from "@/lib/game-manual/config";
import type { XpRuleCatalogData } from "@/lib/data/xp-rules";
import type { LevelLadderData } from "@/types/levels";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildPageMetadata({
  title: "Game Manual — Rules, Scoring, and XP",
  description:
    "Official Shooting Challenge game manual — scoring rules, XP reward rules, level gates, and program reference for families.",
  path: "/game-manual",
});

/** ISR: refresh configuration sections every 5 minutes. */
export const revalidate = 300;

/**
 * Game Manual — Adobe-hosted document plus live configuration sections
 * (XP Reward Rules, Levels) read from Airtable. Config fetch failures fall
 * back to empty states so the manual link keeps working.
 */
export default async function GameManualPage() {
  const [xpCatalog, levels] = await Promise.all([
    fetchXpRuleCatalog().catch((): XpRuleCatalogData | null => null),
    fetchLevelLadder().catch((): LevelLadderData | null => null),
  ]);

  return (
    <GameManualView
      manualUrl={getGameManualUrl()}
      xpCatalog={xpCatalog}
      levels={levels}
    />
  );
}
