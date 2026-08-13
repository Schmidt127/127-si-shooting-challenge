import type { Metadata } from "next";

import { HomePageStandingsError, HomePageView } from "@/components/home/home-page-view";
import { fetchLeaderboard } from "@/lib/airtable/queries";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";

export const metadata: Metadata = {
  title: {
    absolute: "Shooting Challenge | 127 Sports Intensity",
  },
  description: SHOOTING_CHALLENGE.description,
};

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function ShootingChallengeHomePage() {
  try {
    const data = await fetchLeaderboard();
    return <HomePageView topEntries={data.entries.slice(0, 3)} />;
  } catch (error) {
    console.error("Home standings query failed closed.", error);
    return <HomePageStandingsError />;
  }
}
