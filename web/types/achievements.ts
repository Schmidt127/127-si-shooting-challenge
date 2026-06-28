export type AchievementRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export type AchievementDefinition = {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  rarity: AchievementRarity | string;
  triggerType: string;
  triggerThreshold: number | null;
  sortOrder: number;
  badgeIconName: string;
  repeatable: boolean;
  oneTimeUnlock: boolean;
  weekSpecific: boolean;
};

export type AchievementCatalogData = {
  achievements: AchievementDefinition[];
  totalAchievements: number;
  updatedAt: string;
};
