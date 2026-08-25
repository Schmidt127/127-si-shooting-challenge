import { describe, expect, it } from "vitest";

import { resolveBadgeIcon } from "@/lib/achievements/resolve-badge-icon";
import { IconBolt, IconMedal, IconTrophy } from "@/components/icons/shoot-icons";

describe("resolveBadgeIcon", () => {
  it("maps known badge icon names", () => {
    expect(resolveBadgeIcon("Trophy")).toBe(IconTrophy);
    expect(resolveBadgeIcon("bolt")).toBe(IconBolt);
  });

  it("falls back to medal for unknown or empty names", () => {
    expect(resolveBadgeIcon("unknown-badge")).toBe(IconMedal);
    expect(resolveBadgeIcon(null)).toBe(IconMedal);
    expect(resolveBadgeIcon("")).toBe(IconMedal);
  });
});
