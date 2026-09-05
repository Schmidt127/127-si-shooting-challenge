import { listAirtableRecords } from "@/lib/airtable/client";
import {
  PUBLIC_AIRTABLE_TABLES,
  REGISTERING_SHOOTING_CHALLENGE_FILTER,
} from "@/lib/airtable/public-tables";
import { asText } from "@/lib/data/airtable-values";
import { resolveRegisteringShootingChallengeProgramInstance } from "@/lib/airtable/registering-program-instance";

export type ProgramPricing = {
  programName: string;
  schoolYear: string;
  priceEarlyBird?: number;
  priceRegular?: number;
  priceLate?: number;
  deadlineEarlyBird?: string;
  deadlineRegular?: string;
  /** Lowest published tier price when any tier exists. */
  priceFrom?: number;
  whatIsIncluded: string[];
  registrationUrl: string;
};

type PricingFields = {
  "Name - Program Instance"?: unknown;
  "School Year - Linked"?: unknown;
  "Price - Early Bird"?: unknown;
  "Price - Regular"?: unknown;
  "Price - Late"?: unknown;
  "Deadline - Early Bird"?: unknown;
  "Deadline - Regular Price"?: unknown;
};

const PRICING_FIELDS = [
  "Name - Program Instance",
  "School Year - Linked",
  "Price - Early Bird",
  "Price - Regular",
  "Price - Late",
  "Deadline - Early Bird",
  "Deadline - Regular Price",
] as const;

function readCurrency(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function readDate(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

/**
 * Public pricing for the Registering Shooting Challenge Program Instance.
 * Returns null when no reliable currency fields are present — never invents prices.
 */
export async function fetchRegisteringProgramPricing(
  revalidateSeconds = 300,
  registrationUrl: string,
): Promise<ProgramPricing | null> {
  const scope = await resolveRegisteringShootingChallengeProgramInstance(revalidateSeconds);
  const rows = await listAirtableRecords<PricingFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.programInstanceSync.name,
    fields: [...PRICING_FIELDS],
    filterByFormula: REGISTERING_SHOOTING_CHALLENGE_FILTER,
    revalidateSeconds,
  });

  const record = rows.records.find((row) => row.id === scope.id) ?? rows.records[0];
  if (!record) return null;

  const fields = record.fields;
  const priceEarlyBird = readCurrency(fields["Price - Early Bird"]);
  const priceRegular = readCurrency(fields["Price - Regular"]);
  const priceLate = readCurrency(fields["Price - Late"]);
  const candidates = [priceEarlyBird, priceRegular, priceLate].filter(
    (value): value is number => typeof value === "number",
  );

  if (candidates.length === 0) return null;

  return {
    programName: asText(fields["Name - Program Instance"], scope.name) || scope.name,
    schoolYear: asText(fields["School Year - Linked"], scope.schoolYear) || scope.schoolYear,
    priceEarlyBird,
    priceRegular,
    priceLate,
    deadlineEarlyBird: readDate(fields["Deadline - Early Bird"]),
    deadlineRegular: readDate(fields["Deadline - Regular Price"]),
    priceFrom: Math.min(...candidates),
    whatIsIncluded: [
      "Season-long Shooting Challenge participation",
      "Real coaching touchpoints: personalized video feedback, homework review, goal support, and accountability",
      "Homework, levels, leaderboard, and progress tracking",
      "Access to tutorials, Zoom coaching sessions, and game manual resources",
      "Eligible season awards and recognition provided as Amazon gift cards through Award Recipients",
    ],
    registrationUrl,
  };
}

export function formatUsd(amount?: number): string | null {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
