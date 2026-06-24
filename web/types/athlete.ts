/** App-level athlete / enrollment types (mapped from Airtable). */

export type AthleteProfile = {
  id: string;
  slug: string;
  displayName: string;
  schoolYear?: string;
  grade?: string;
  totalXp: number;
  currentLevel?: string;
  currentStreak?: number;
  avatarUrl?: string;
};

export type AthleteSummaryCard = Pick<
  AthleteProfile,
  "id" | "slug" | "displayName" | "totalXp" | "currentLevel"
>;
