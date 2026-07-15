import type { Metadata } from "next";

import { AthleteDashboardView } from "@/components/dashboard/athlete-dashboard-view";
import { loadAthleteDashboard } from "@/lib/data/athlete-dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Athlete program home — level, XP, weekly shots, streak, Perfect Week, homework, and next action.",
};

export const revalidate = 60;

export default async function AthleteDashboardPage() {
  const data = await loadAthleteDashboard();
  return <AthleteDashboardView data={data} />;
}
