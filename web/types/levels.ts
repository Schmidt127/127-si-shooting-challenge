export type CatalogAttachment = {
  id: string;
  url: string;
  filename: string;
};

export type LevelDefinition = {
  id: string;
  name: string;
  displayName: string;
  sortOrder: number;
  rank: number;
  xpRequired: number;
  xpFromPrevious: number;
  coverImage: CatalogAttachment | null;
  gateCriteria: string;
  previousLevelId: string;
  nextLevelId: string;
};

export type LevelLadderData = {
  levels: LevelDefinition[];
  totalLevels: number;
  maxXp: number;
  updatedAt: string;
};
