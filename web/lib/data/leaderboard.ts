import type { LeaderboardData, LeaderboardEntry } from "@/types/leaderboard";

import {
  AirtableFieldError,
  asBoolean,
  asText,
  requireExactlyOneLinkedRecordId,
  requireExactlyOneLookupNumber,
  requireExactlyOneLookupText,
  requireSelectName,
  selectName,
} from "./airtable-values";
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

function integrity<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    if (error instanceof AirtableFieldError) {
      throw new LeaderboardIntegrityError(error.message);
    }
    throw error;
  }
}

function enrollmentLabel(recordId: string): string {
  return `Enrollment ${recordId}`;
}

function requireNonNegativeScalar(
  value: unknown,
  fieldName: string,
  recordId: string,
): number {
  // Formula/rollup totals arrive as scalars; lookups may arrive as one-item arrays.
  return integrity(() =>
    requireExactlyOneLookupNumber(value, fieldName, enrollmentLabel(recordId)),
  );
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
    levelSortOrder: requireNonNegativeScalar(
      fields["Level Sort Order - For Softr"],
      "Level Sort Order - For Softr",
      "unknown",
    ),
    xp: requireNonNegativeScalar(fields["Lifetime XP Total"], "Lifetime XP Total", "unknown"),
    totalShots: requireNonNegativeScalar(
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
 * Validate one enrollment row against the public standings contract.
 * Throws LeaderboardIntegrityError when the row must not be published.
 */
function assertEligibleLeaderboardRecord(
  record: LeaderboardRecord,
  scope: LeaderboardScope,
): string {
  const { fields } = record;
  const label = enrollmentLabel(record.id);

  if (!asBoolean(fields["Active?"])) {
    throw new LeaderboardIntegrityError(`Enrollment ${record.id} is inactive but was returned by standings.`);
  }

  integrity(() => requireExactlyOneLinkedRecordId(fields.Athlete, "Athlete link", label));
  const athlete = integrity(() =>
    requireExactlyOneLookupText(fields["Athlete ID Lookup"], "Athlete ID Lookup", label),
  );
  const programInstanceId = integrity(() =>
    requireExactlyOneLinkedRecordId(fields["Program Instance"], "Program Instance link", label),
  );
  const schoolYear = integrity(() =>
    requireSelectName(fields["School Year"], "School Year", label),
  );

  if (schoolYear !== scope.schoolYear || programInstanceId !== scope.programInstanceId) {
    throw new LeaderboardIntegrityError(
      `Enrollment ${record.id} is outside the configured standings scope (${schoolYear} / ${programInstanceId}).`,
    );
  }

  // Live Airtable REST returns Current Level as linked record ids ["rec…"].
  const currentLevelId = integrity(() =>
    requireExactlyOneLinkedRecordId(fields["Current Level"], "Current Level", label),
  );
  const status = integrity(() =>
    requireSelectName(fields["Level Status"], "Level Status", label),
  );
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
  // Level Sort Order - For Softr is a lookup and may arrive as [n].
  const levelRank = requireNonNegativeScalar(
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
  const xp = requireNonNegativeScalar(fields["Lifetime XP Total"], "Lifetime XP Total", record.id);
  if (xp < activeLevel.xpRequired) {
    throw new LeaderboardIntegrityError(
      `Enrollment ${record.id} has XP below its assigned Current Level threshold.`,
    );
  }
  requireNonNegativeScalar(fields["Total Shots Counted"], "Total Shots Counted", record.id);

  return `${athlete}|${programInstanceId}|${schoolYear}`;
}

function preferLeaderboardRecord<T extends LeaderboardRecord>(candidate: T, incumbent: T): T {
  // compareLeaderboardSortKeys(a, b) < 0 means a ranks above b (same order as Array.sort).
  const cmp = compareLeaderboardSortKeys(
    getLeaderboardSortKeys(candidate.fields),
    getLeaderboardSortKeys(incumbent.fields),
  );
  if (cmp < 0) return candidate;
  if (cmp > 0) return incumbent;
  return candidate.id.localeCompare(incumbent.id) < 0 ? candidate : incumbent;
}

/**
 * The public query uses a named Airtable view as its primary scope, then checks
 * each returned row again. Ineligible rows (inactive, wrong season, unsettled
 * level/XP, malformed links) are skipped so one bad enrollment cannot blank the
 * public board. Duplicate Athlete + Program Instance + School Year identities
 * keep the higher-ranked row (level → XP → shots → record id).
 *
 * Returns only publishable rows. Zero eligible rows is a legitimate empty board,
 * not a hard failure — scope/config failures still throw upstream.
 */
export function requireEligibleLeaderboardRecords<T extends LeaderboardRecord>(
  records: T[],
  scope: LeaderboardScope,
): T[] {
  const byIdentity = new Map<string, T>();
  let skippedCount = 0;

  for (const record of records) {
    try {
      const identity = assertEligibleLeaderboardRecord(record, scope);
      const incumbent = byIdentity.get(identity);
      if (!incumbent) {
        byIdentity.set(identity, record);
        continue;
      }
      byIdentity.set(identity, preferLeaderboardRecord(record, incumbent));
      skippedCount += 1;
    } catch (error) {
      if (error instanceof LeaderboardIntegrityError) {
        skippedCount += 1;
        continue;
      }
      throw error;
    }
  }

  if (skippedCount > 0 && process.env.NODE_ENV !== "test") {
    console.warn("[leaderboard] skipped ineligible standings rows", { skippedCount });
  }

  return [...byIdentity.values()];
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
    grade: selectName(fields.Grade, asText(fields.Grade)),
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
