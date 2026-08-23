/** XP activity table row model — privacy-safe, no Airtable record ids in public payloads. */

export type XpActivityRowKind =
  | "shooting_submission"
  | "homework"
  | "video"
  | "shot_milestone"
  | "achievement"
  | "streak"
  | "perfect_week"
  | "zoom"
  | "weekly_threshold"
  | "manual"
  | "other";

export type XpActivityRow = {
  /** Opaque client key — never an Airtable record id. */
  key: string;
  kind: XpActivityRowKind;
  activityDate: string | null;
  title: string;
  detail: string | null;
  xp: number;
  sourceLabel: string | null;
  bucket: string | null;
  sortDateMs: number;
  sortRank: number;
  parentKey: string | null;
};

export type XpActivityPage = {
  rows: XpActivityRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type XpActivitySortField = "date" | "xp" | "title";
export type XpActivitySortDirection = "asc" | "desc";

export type XpActivityFilterState = {
  query: string;
  kinds: XpActivityRowKind[];
};

export type XpActivityLoadResult =
  | { status: "ok"; data: XpActivityPage }
  | { status: "not_found"; slug: string }
  | { status: "error"; slug: string; message: string };
