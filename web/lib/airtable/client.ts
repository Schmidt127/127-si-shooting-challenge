/**
 * Server-side Airtable REST client helpers.
 *
 * SECURITY: Only import this module from Server Components, Route Handlers,
 * or Server Actions. Never expose AIRTABLE_API_TOKEN to the browser.
 */

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

export type AirtableConfigStatus = {
  configured: boolean;
  hasToken: boolean;
  hasBaseId: boolean;
  baseIdPreview: string | null;
};

/** Returns whether required env vars are present (no network call). */
export function getAirtableConfigStatus(): AirtableConfigStatus {
  const token = process.env.AIRTABLE_API_TOKEN?.trim() ?? "";
  const baseId = process.env.AIRTABLE_BASE_ID?.trim() ?? "";

  return {
    configured: Boolean(token && baseId),
    hasToken: Boolean(token),
    hasBaseId: Boolean(baseId),
    baseIdPreview: baseId ? `${baseId.slice(0, 6)}…` : null,
  };
}

function requireAirtableConfig(): { token: string; baseId: string } {
  const token = process.env.AIRTABLE_API_TOKEN?.trim();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();

  if (!token || !baseId) {
    throw new Error(
      "Missing Airtable configuration. Set AIRTABLE_API_TOKEN and AIRTABLE_BASE_ID in environment variables.",
    );
  }

  return { token, baseId };
}

export type AirtableListParams = {
  tableName: string;
  view?: string;
  filterByFormula?: string;
  maxRecords?: number;
  fields?: string[];
};

/**
 * Minimal list-records fetch. Expand with pagination and caching as queries grow.
 */
export async function listAirtableRecords<TFields extends Record<string, unknown>>(
  params: AirtableListParams,
): Promise<{ records: Array<{ id: string; fields: TFields }> }> {
  const { token, baseId } = requireAirtableConfig();
  const searchParams = new URLSearchParams();

  if (params.view) searchParams.set("view", params.view);
  if (params.filterByFormula) searchParams.set("filterByFormula", params.filterByFormula);
  if (params.maxRecords) searchParams.set("maxRecords", String(params.maxRecords));
  if (params.fields?.length) {
    for (const field of params.fields) {
      searchParams.append("fields[]", field);
    }
  }

  const query = searchParams.toString();
  const url = `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(params.tableName)}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    // Revalidate on each request during early dev; tune per route later.
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Airtable request failed (${response.status}): ${body}`);
  }

  return response.json();
}
