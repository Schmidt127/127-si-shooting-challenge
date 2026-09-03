import { createHash } from "node:crypto";

/** Opaque client key — never an Airtable record id in authenticated dashboard props. */
export function opaqueDashboardKey(prefix: string, recordId: string): string {
  const digest = createHash("sha256").update(recordId).digest("hex").slice(0, 20);
  return `${prefix}-${digest}`;
}
