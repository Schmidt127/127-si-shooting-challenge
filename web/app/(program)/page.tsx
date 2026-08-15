import type { Metadata } from "next";

import { HomePageView } from "@/components/home/home-page-view";
import { fetchLeaderboard } from "@/lib/airtable/queries";
import { SHOOTING_CHALLENGE } from "@/lib/app-config";
import { fetchRegisteringProgramPricing } from "@/lib/data/program-pricing";
import { PLAYER_REGISTRATION } from "@/lib/registration";

export const metadata: Metadata = {
  title: {
    absolute: "Shooting Challenge | 127 Sports Intensity",
  },
  description: SHOOTING_CHALLENGE.description,
};

/** Airtable's 120-second data cache is the sole standings cache layer. */
export const revalidate = 0;

export default async function ShootingChallengeHomePage() {
  const pricing = await fetchRegisteringProgramPricing(300, PLAYER_REGISTRATION.url).catch(
    () => null,
  );

  try {
    const data = await fetchLeaderboard();
    return <HomePageView topEntries={data.entries.slice(0, 3)} pricing={pricing} />;
  } catch (error) {
    console.error("Home standings query failed closed.", error);
    // Keep registration, pricing, and program navigation available when standings fail.
    return <HomePageView topEntries={[]} pricing={pricing} />;
  }
}
