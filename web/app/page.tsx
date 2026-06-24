import type { Metadata } from "next";

import { HubLanding } from "@/components/hub/hub-landing";
import { HUB_BRAND } from "@/lib/products";

export const metadata: Metadata = {
  title: HUB_BRAND.title,
  description:
    "127 Sports Intensity training programs — Shooting Challenge, Dribbling Challenge, and Kids Ref Now.",
};

export default function HomePage() {
  return <HubLanding />;
}
