import type { CatalogAttachment } from "@/types/levels";

export type TutorialItem = {
  id: string;
  name: string;
  videoUrl: string;
  athlete: string;
  athleteHeadshot: CatalogAttachment | null;
  thumbnail: CatalogAttachment | null;
  tutorialTypes: string[];
  categories: string[];
  programs: string[];
  briefDescription: string;
  detailedDescription: string;
  sortOrder: number;
};

export type TutorialCategoryGroup = {
  category: string;
  tutorials: TutorialItem[];
};

export type TutorialCatalogData = {
  categoryGroups: TutorialCategoryGroup[];
  totalTutorials: number;
  updatedAt: string;
};
