import { listAirtableRecords } from "@/lib/airtable/client";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import {
  buildGradeBandFilterOptions,
  type GradeBandFields,
  type GradeBandOption,
  buildAllGradeBandOption,
} from "@/lib/data/grade-bands";

const REVALIDATE_SECONDS = 120;

const GRADE_BAND_FILTER_FIELDS = [
  "Grade Band Name",
  "Active?",
  "Sort Order",
  "Min Grade",
  "Max Grade",
] as const;

/**
 * Active Grade Bands for public leaderboard filters.
 * Failures / empty results fall back to All Grade Bands only — never crash the page.
 */
export async function fetchActiveGradeBandOptions(): Promise<GradeBandOption[]> {
  try {
    const response = await listAirtableRecords<GradeBandFields>({
      tableName: PUBLIC_AIRTABLE_TABLES.gradeBands.name,
      fields: [...GRADE_BAND_FILTER_FIELDS],
      filterByFormula: "{Active?} = 1",
      sort: [{ field: "Sort Order", direction: "asc" }],
      revalidateSeconds: REVALIDATE_SECONDS,
    });
    const options = buildGradeBandFilterOptions(response.records);
    return options.length > 0 ? options : [buildAllGradeBandOption()];
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.warn("[leaderboard] grade band options unavailable; falling back to All", error);
    }
    return [buildAllGradeBandOption()];
  }
}
