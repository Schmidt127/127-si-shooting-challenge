/**
 * Leaderboard grade-band filters driven by Airtable Grade Bands
 * (`tblOhHrIqpjcsk2WG`), not hardcoded school-level buckets.
 */

import { asBoolean, asOptionalNumber, asText } from "@/lib/data/airtable-values";

export const ALL_GRADE_BANDS_ID = "all";
export const ALL_GRADE_BANDS_LABEL = "All Grade Bands";

export type GradeBandOption = {
  /** Public URL slug — Grade Band Name (normalized), or `all`. */
  id: string;
  label: string;
  shortLabel: string;
  minGrade: number | null;
  maxGrade: number | null;
  sortOrder: number;
};

/** Raw Grade Bands fields used by the public leaderboard filter. */
export type GradeBandFields = {
  "Grade Band Name"?: unknown;
  "Active?"?: unknown;
  "Sort Order"?: unknown;
  "Min Grade"?: unknown;
  "Max Grade"?: unknown;
};

type GradeBandRecord = { id: string; fields: GradeBandFields };

/**
 * Stable public slug from Grade Band Name (e.g. `3-4`, `k-2`).
 * Never uses Airtable record ids.
 */
export function gradeBandNameToSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]+/g, "");
}

export function buildAllGradeBandOption(): GradeBandOption {
  return {
    id: ALL_GRADE_BANDS_ID,
    label: ALL_GRADE_BANDS_LABEL,
    shortLabel: "All",
    minGrade: null,
    maxGrade: null,
    sortOrder: Number.NEGATIVE_INFINITY,
  };
}

function optionalGradeNumber(value: unknown): number | null {
  return asOptionalNumber(value);
}

/**
 * Map active Grade Band records into filter options, sorted by Sort Order asc.
 * Inactive / unlabeled rows are skipped. Duplicate slugs keep the first (lowest sort).
 */
export function mapActiveGradeBandOptions(records: GradeBandRecord[]): GradeBandOption[] {
  const mapped: GradeBandOption[] = [];
  const seen = new Set<string>();

  const sorted = [...records].sort((left, right) => {
    const leftSort = asOptionalNumber(left.fields["Sort Order"]) ?? Number.POSITIVE_INFINITY;
    const rightSort = asOptionalNumber(right.fields["Sort Order"]) ?? Number.POSITIVE_INFINITY;
    if (leftSort !== rightSort) return leftSort - rightSort;
    return left.id.localeCompare(right.id);
  });

  for (const record of sorted) {
    if (!asBoolean(record.fields["Active?"])) continue;
    const name = asText(record.fields["Grade Band Name"], "");
    if (!name || name === "—") continue;
    const id = gradeBandNameToSlug(name);
    if (!id || id === ALL_GRADE_BANDS_ID || seen.has(id)) continue;
    seen.add(id);
    mapped.push({
      id,
      label: name,
      shortLabel: name,
      minGrade: optionalGradeNumber(record.fields["Min Grade"]),
      maxGrade: optionalGradeNumber(record.fields["Max Grade"]),
      sortOrder: asOptionalNumber(record.fields["Sort Order"]) ?? mapped.length,
    });
  }

  return mapped;
}

/** Options for the filter UI: All Grade Bands first, then active configured bands. */
export function buildGradeBandFilterOptions(records: GradeBandRecord[]): GradeBandOption[] {
  return [buildAllGradeBandOption(), ...mapActiveGradeBandOptions(records)];
}

/**
 * Resolve a URL/query band value to a known option id.
 * Empty, stale, legacy school buckets, or unknown values fall back to All.
 */
export function resolveSelectedGradeBandId(
  query: string | null | undefined,
  options: GradeBandOption[],
): string {
  const raw = String(query ?? "").trim();
  if (!raw) return ALL_GRADE_BANDS_ID;
  const slug = gradeBandNameToSlug(raw);
  if (!slug || slug === ALL_GRADE_BANDS_ID) return ALL_GRADE_BANDS_ID;
  const match = options.find((option) => option.id === slug);
  return match && match.id !== ALL_GRADE_BANDS_ID ? match.id : ALL_GRADE_BANDS_ID;
}

function normalizeBandLabel(label: string | null | undefined): string {
  return gradeBandNameToSlug(String(label ?? ""));
}

export function entryMatchesGradeBand(
  entry: { gradeBandLabel?: string | null },
  bandId: string,
): boolean {
  if (!bandId || bandId === ALL_GRADE_BANDS_ID) return true;
  const label = normalizeBandLabel(entry.gradeBandLabel);
  return Boolean(label) && label === bandId;
}

export function filterByGradeBand<T extends { gradeBandLabel?: string | null }>(
  entries: T[],
  bandId: string,
): T[] {
  if (!bandId || bandId === ALL_GRADE_BANDS_ID) return entries;
  return entries.filter((entry) => entryMatchesGradeBand(entry, bandId));
}

/** Re-rank filtered entries starting at 1 while preserving relative order. */
export function withFilteredRanks<T extends { rank: number }>(entries: T[]): T[] {
  return entries.map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function countEntriesByGradeBand<T extends { gradeBandLabel?: string | null }>(
  entries: T[],
  options: GradeBandOption[],
): Record<string, number> {
  const counts: Record<string, number> = { [ALL_GRADE_BANDS_ID]: entries.length };
  for (const option of options) {
    if (option.id === ALL_GRADE_BANDS_ID) continue;
    counts[option.id] = entries.filter((entry) => entryMatchesGradeBand(entry, option.id)).length;
  }
  return counts;
}
