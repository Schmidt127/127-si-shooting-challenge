/** Grade-band helpers for leaderboard filters and athlete identity display. */

export type GradeBandId = "all" | "elementary" | "middle" | "high" | "other";

export type GradeBandOption = {
  id: GradeBandId;
  label: string;
  shortLabel: string;
};

export const GRADE_BAND_OPTIONS: GradeBandOption[] = [
  { id: "all", label: "All grades", shortLabel: "All" },
  { id: "elementary", label: "Elementary (K–5)", shortLabel: "K–5" },
  { id: "middle", label: "Middle (6–8)", shortLabel: "6–8" },
  { id: "high", label: "High school (9–12)", shortLabel: "9–12" },
  { id: "other", label: "Other / unset", shortLabel: "Other" },
];

function parseGradeNumber(grade: string): number | null {
  const trimmed = grade.trim();
  if (!trimmed || trimmed === "—") return null;

  const lower = trimmed.toLowerCase();
  if (lower === "k" || lower === "prek" || lower === "pre-k" || lower === "pre k" || lower === "kindergarten") {
    return 0;
  }

  if (/^\d{1,2}$/.test(trimmed)) return Number(trimmed);

  const match = trimmed.match(/(\d{1,2})/);
  if (match) return Number(match[1]);

  return null;
}

export function gradeToBand(grade: string): Exclude<GradeBandId, "all"> {
  const n = parseGradeNumber(grade);
  if (n === null) return "other";
  if (n <= 5) return "elementary";
  if (n <= 8) return "middle";
  if (n <= 12) return "high";
  return "other";
}

export function entryMatchesGradeBand(
  grade: string,
  band: GradeBandId,
): boolean {
  if (band === "all") return true;
  return gradeToBand(grade) === band;
}

export function filterByGradeBand<T extends { grade: string }>(
  entries: T[],
  band: GradeBandId,
): T[] {
  if (band === "all") return entries;
  return entries.filter((entry) => entryMatchesGradeBand(entry.grade, band));
}

/** Re-rank filtered entries starting at 1 while preserving relative order. */
export function withFilteredRanks<T extends { rank: number }>(entries: T[]): T[] {
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
