import type { LeaderboardData, LeaderboardEntry } from "@/types/leaderboard";

import { asBoolean, asText, linkedRecordIds } from "./airtable-values";
import { mapAttachments } from "./homework";
import { isValidPublicSlug, normalizeProfileSlug } from "./public-athlete-profile";

/** Raw Enrollments fields consumed by the public leaderboard. */
export type EnrollmentLeaderboardFields = {
  "Active?"?: unknown;
  Athlete?: unknown;
  "Athlete ID Lookup"?: unknown;
  "Program Instance"?: unknown;
  "Full Athlete Name"?: unknown;
  "School Name Lookup"?: unknown;
  Grade?: unknown;
  "Current Level"?: unknown;
  "Current Level - Public Facing Display"?: unknown;
  "Level Sort Order - For Softr"?: unknown;
  "Level Status"?: unknown;
  "Athlete Headshot"?: unknown;
  "Lifetime XP Total"?: unknown;
  "Total Shots Counted"?: unknown;
  "School Year"?: unknown;
  "Program Instance Name Only"?: unknown;
  "Public Profile Enabled"?: unknown;
  "Public Profile Slug"?: unknown;
};

/** Active Level contract keyed by Airtable Level record id (live REST link shape). */
export type ActiveLevelContract = {
  name: string;
  rank: number;
  xpRequired: number;
};

export type LeaderboardScope = {
  schoolYear: string;
  /** Canonical Program Instance record id from the Registering season row. */
  programInstanceId: string;
  /** Active Levels keyed by Level record id. */
  activeLevelsById: ReadonlyMap<string, ActiveLevelContract>;
};

type LeaderboardRecord = { id: string; fields: EnrollmentLeaderboardFields };

/** A source row is incomplete or ambiguous and must not be published. */
export class LeaderboardIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LeaderboardIntegrityError";
  }
}

function linkedTokens(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === "string") return entry.trim();
      if (typeof entry === "object" && entry !== null && "name" in entry) {
        const name = (entry as { name?: unknown }).name;
        return typeof name === "string" ? name.trim() : "";
      }
      return "";
    })
    .filter(Boolean);
}

function requiredNonNegativeNumber(value: unknown, fieldName: string, recordId: string): number {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.replace(/,/g, ""));
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  throw new LeaderboardIntegrityError(
    `Enrollment ${recordId} has missing or invalid ${fieldName}; standings remain unavailable until it settles.`,
  );
}

function requireExactlyOneLinkedToken(value: unknown, fieldName: string, recordId: string): string {
  const values = linkedTokens(value);
  if (values.length !== 1) {
    throw new LeaderboardIntegrityError(
      `Enrollment ${recordId} requires exactly one ${fieldName}; found ${values.length}.`,
    );
  }
  return values[0];
}

function requireExactlyOneLinkedRecordId(value: unknown, fieldName: string, recordId: string): string {
  const values = linkedRecordIds(value);
  if (values.length !== 1) {
    throw new LeaderboardIntegrityError(
      `Enrollment ${recordId} requires exactly one ${fieldName}; found ${values.length}.`,
    );
  }
  return values[0];
}

function requireText(value: unknown, fieldName: string, recordId: string): string {
  const text = asText(value, "");
  if (!text || text === "—") {
    throw new LeaderboardIntegrityError(
      `Enrollment ${recordId} has missing ${fieldName}; standings remain unavailable until it settles.`,
    );
  }
  return text;
}

export type LeaderboardSortKeys = {
  levelSortOrder: number;
  xp: number;
  totalShots: number;
};

export function getLeaderboardSortKeys(fields: EnrollmentLeaderboardFields): LeaderboardSortKeys {
  return {
    levelSortOrder: requiredNonNegativeNumber(
      fields["Level Sort Order - For Softr"],
      "Level Sort Order - For Softr",
      "unknown",
    ),
    xp: requiredNonNegativeNumber(fields["Lifetime XP Total"], "Lifetime XP Total", "unknown"),
    totalShots: requiredNonNegativeNumber(
      fields["Total Shots Counted"],
      "Total Shots Counted",
      "unknown",
    ),
  };
}

/** Rank by level (desc), then XP (desc), then total shots (desc). */
export function compareLeaderboardSortKeys(a: LeaderboardSortKeys, b: LeaderboardSortKeys): number {
  if (b.levelSortOrder !== a.levelSortOrder) return b.levelSortOrder - a.levelSortOrder;
  if (b.xp !== a.xp) return b.xp - a.xp;
  if (b.totalShots !== a.totalShots) return b.totalShots - a.totalShots;
  return 0;
}

export function sortLeaderboardRecords<T extends LeaderboardRecord>(records: T[]): T[] {
  return [...records].sort((left, right) => {
    const byKeys = compareLeaderboardSortKeys(
      getLeaderboardSortKeys(left.fields),
      getLeaderboardSortKeys(right.fields),
    );
    if (byKeys !== 0) return byKeys;

    /* Deterministic tie order across fetches: name, then record id. */
    const byName = asText(left.fields["Full Athlete Name"], "").localeCompare(
      asText(right.fields["Full Athlete Name"], ""),
    );
    if (byName !== 0) return byName;
    return left.id.localeCompare(right.id);
  });
}

/**
 * The public query uses a named Airtable view as its primary scope, then checks
 * each returned row again. A broken view therefore fails closed instead of
 * publishing an inactive, prior-year, wrong-program, duplicate, or unsettled row.
 */
export function requireEligibleLeaderboardRecords<T extends LeaderboardRecord>(
  records: T[],
  scope: LeaderboardScope,
): T[] {
  const canonicalIdentities = new Map<string, string>();

  for (const record of records) {
    const { fields } = record;
    if (!asBoolean(fields["Active?"])) {
      throw new LeaderboardIntegrityError(`Enrollment ${record.id} is inactive but was returned by standings.`);
    }

    requireExactlyOneLinkedToken(fields.Athlete, "Athlete link", record.id);
    const athlete = requireExactlyOneLinkedToken(
      fields["Athlete ID Lookup"],
      "Athlete ID Lookup",
      record.id,
    );
    const programInstanceId = requireExactlyOneLinkedRecordId(
      fields["Program Instance"],
      "Program Instance link",
      record.id,
    );
    const schoolYear = requireText(fields["School Year"], "School Year", record.id);

    if (schoolYear !== scope.schoolYear || programInstanceId !== scope.programInstanceId) {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} is outside the configured standings scope (${schoolYear} / ${programInstanceId}).`,
      );
    }

    const identity = `${athlete}|${programInstanceId}|${schoolYear}`;
    const duplicate = canonicalIdentities.get(identity);
    if (duplicate) {
      throw new LeaderboardIntegrityError(
        `Duplicate canonical Enrollment identity ${identity}: ${duplicate} and ${record.id}.`,
      );
    }
    canonicalIdentities.set(identity, record.id);

    // Live Airtable REST returns Current Level as linked record ids ["rec…"].
    const currentLevelId = requireExactlyOneLinkedRecordId(
      fields["Current Level"],
      "Current Level",
      record.id,
    );
    const status = requireText(fields["Level Status"], "Level Status", record.id);
    if (status !== "Assigned" && status !== "Gate Blocked") {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} has non-settled Level Status "${status}".`,
      );
    }
    const publicLevel = requireText(
      fields["Current Level - Public Facing Display"],
      "Current Level display",
      record.id,
    );
    const levelRank = requiredNonNegativeNumber(
      fields["Level Sort Order - For Softr"],
      "Level Rank",
      record.id,
    );
    const activeLevel = scope.activeLevelsById.get(currentLevelId);
    if (activeLevel === undefined) {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} has an inactive or unknown Current Level.`,
      );
    }
    if (publicLevel !== activeLevel.name) {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} has mismatched Current Level display and link.`,
      );
    }
    if (activeLevel.rank !== levelRank) {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} has an inactive or mismatched Current Level rank.`,
      );
    }
    const xp = requiredNonNegativeNumber(fields["Lifetime XP Total"], "Lifetime XP Total", record.id);
    if (xp < activeLevel.xpRequired) {
      throw new LeaderboardIntegrityError(
        `Enrollment ${record.id} has XP below its assigned Current Level threshold.`,
      );
    }
    requiredNonNegativeNumber(fields["Total Shots Counted"], "Total Shots Counted", record.id);
  }

  return records;
}

function resolvePublicProfileSlug(fields: EnrollmentLeaderboardFields): string | null {
  if (!asBoolean(fields["Public Profile Enabled"])) return null;
  const raw = asText(fields["Public Profile Slug"], "");
  if (!raw || raw === "—") return null;
  const cleaned = normalizeProfileSlug(raw);
  return isValidPublicSlug(cleaned) ? cleaned : null;
}

export function mapEnrollmentToLeaderboardEntry(
  record: LeaderboardRecord,
  rank: number,
): LeaderboardEntry {
  const fields = record.fields;
  const sortKeys = getLeaderboardSortKeys(fields);
  const headshot = mapAttachments(fields["Athlete Headshot"])[0];

  return {
    rank,
    displayName: asText(fields["Full Athlete Name"], "Unknown Athlete"),
    school: asText(fields["School Name Lookup"]),
    grade: asText(fields.Grade),
    level: asText(fields["Current Level - Public Facing Display"]),
    headshot: headshot?.url ? { url: headshot.url } : null,
    xp: sortKeys.xp,
    totalShots: sortKeys.totalShots,
    publicProfileSlug: resolvePublicProfileSlug(fields),
  };
}

export function buildLeaderboardData(
  records: LeaderboardRecord[],
  seasonLabel = "Current Season",
): LeaderboardData {
  const sorted = sortLeaderboardRecords(records);
  const entries = sorted.map((record, index) =>
    mapEnrollmentToLeaderboardEntry(record, index + 1),
  );

  return {
    entries,
    updatedAt: new Date().toISOString(),
    seasonLabel,
  };
}

export function inferSeasonLabel(
  records: Array<{ fields: EnrollmentLeaderboardFields }>,
): string {
  const schoolYear = records
    .map((record) => asText(record.fields["School Year"], ""))
    .find((year) => year && year !== "—");

  return schoolYear ? `${schoolYear} Season` : "Current Season";
}
