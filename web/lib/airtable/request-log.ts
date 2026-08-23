/**
 * Structured Airtable request logging for profile and XP activity loads.
 * Never log secrets, recipient information, or sensitive athlete data.
 */

export type AirtableRequestLogContext = {
  scope: "airtable-profile" | "airtable-xp" | "airtable-leaderboard";
  table: string;
  durationMs: number;
  records: number;
  cache: "hit" | "miss" | "bypass";
  error?: string;
};

export function logAirtableRequest(context: AirtableRequestLogContext): void {
  const errorPart = context.error ? ` error=${context.error}` : " error=";
  console.log(
    `[${context.scope}] table=${context.table} durationMs=${context.durationMs} records=${context.records} cache=${context.cache}${errorPart}`,
  );
}
