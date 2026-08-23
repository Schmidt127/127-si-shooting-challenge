/** Shared Airtable formula helpers for public queries. */

export function activeSchoolYearFilterClause(): string {
  const year = String(process.env.AIRTABLE_ACTIVE_SCHOOL_YEAR || "").trim();
  if (!year) return "";
  const escaped = year.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `{School Year} = "${escaped}"`;
}

export function andFormula(...clauses: Array<string | false | null | undefined>): string {
  const parts = clauses.filter((c): c is string => typeof c === "string" && c.length > 0);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return `AND(${parts.join(", ")})`;
}
