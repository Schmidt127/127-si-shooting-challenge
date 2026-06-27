import type { Metadata } from "next";

import { HomePageFallback, HomePageView } from "@/components/home/home-page-view";
import { fetchLeaderboard } from "@/lib/airtable/queries";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";

export const metadata: Metadata = {
  title: SHOOTING_CHALLENGE.name,
  description: SHOOTING_CHALLENGE.description,
};

export const revalidate = 120;

export default async function ShootingChallengeHomePage() {
  try {
    const data = await fetchLeaderboard();
    return <HomePageView topEntries={data.entries.slice(0, 3)} />;
  } catch {
    return <HomePageFallback />;
  }
}
