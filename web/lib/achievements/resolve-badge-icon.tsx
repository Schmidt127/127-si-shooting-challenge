import type { ComponentType, SVGProps } from "react";

import {
  IconBasketball,
  IconBolt,
  IconBook,
  IconCrown,
  IconMedal,
  IconPlay,
  IconTarget,
  IconTrophy,
  IconVideoCall,
} from "@/components/icons/shoot-icons";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const BADGE_ICON_MAP: Record<string, IconComponent> = {
  trophy: IconTrophy,
  medal: IconMedal,
  target: IconTarget,
  bolt: IconBolt,
  streak: IconBolt,
  fire: IconBolt,
  crown: IconCrown,
  book: IconBook,
  homework: IconBook,
  basketball: IconBasketball,
  play: IconPlay,
  video: IconPlay,
  zoom: IconVideoCall,
  videocall: IconVideoCall,
};

/**
 * Map Airtable "Badge Icon Name" text to a brand-safe shoot icon.
 * Unknown names fall back to IconMedal — never invent artwork.
 */
export function resolveBadgeIcon(badgeIconName: string | null | undefined): IconComponent {
  const key = badgeIconName?.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!key) return IconMedal;
  return BADGE_ICON_MAP[key] ?? IconMedal;
}
