/**
 * Server-side Airtable REST client helpers.
 *
 * SECURITY: Only import this module from Server Components, Route Handlers,
 * or Server Actions. Never expose AIRTABLE_API_TOKEN to the browser.
 */

import { AirtableApiError } from "@/lib/airtable/errors";

const AIRTABLE_API_BASE = "https://api.airtable.com/v0";

export type AirtableConfigStatus = {
  configured: boolean;
  hasToken: boolean;
  hasBaseId: boolean;
  baseIdPreview: string | null;
};

export type AirtableTokenValidation = {
  valid: boolean;
  error: string | null;
};

/** Live check that the PAT is accepted by Airtable (not just present in env). */
export async function validateAirtableToken(): Promise<AirtableTokenValidation> {
  const token = process.env.AIRTABLE_API_TOKEN?.trim();
  if (!token) {
    return { valid: false, error: "AIRTABLE_API_TOKEN is not set." };
  }

  try {
    const response = await fetch("https://api.airtable.com/v0/meta/whoami", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (response.ok) {
      return { valid: true, error: null };
    }

    const body = await response.text();
    return {
      valid: false,
      error: `Airtable rejected the token (${response.status}): ${body}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown network error.";
    return { valid: false, error: message };
  }
}

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

function requireAirtableToken(): string {
  const token = process.env.AIRTABLE_API_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "Missing Airtable configuration. Set AIRTABLE_API_TOKEN in environment variables.",
    );
  }
  return token;
}

function requireAirtableConfig(): { token: string; baseId: string } {
  const token = requireAirtableToken();
  const baseId = process.env.AIRTABLE_BASE_ID?.trim();

  if (!baseId) {
    throw new Error(
      "Missing Airtable configuration. Set AIRTABLE_BASE_ID in environment variables.",
    );
  }

  return { token, baseId };
}

export function getAirtableBaseConfigStatus(baseIdEnvKey: string): AirtableConfigStatus {
  const token = process.env.AIRTABLE_API_TOKEN?.trim() ?? "";
  const baseId = process.env[baseIdEnvKey]?.trim() ?? "";

  return {
    configured: Boolean(token && baseId),
    hasToken: Boolean(token),
    hasBaseId: Boolean(baseId),
    baseIdPreview: baseId ? `${baseId.slice(0, 6)}…` : null,
  };
}

export type AirtableSort = {
  field: string;
  direction?: "asc" | "desc";
};

export type AirtableListParams = {
  tableName: string;
  view?: string;
  filterByFormula?: string;
  maxRecords?: number;
  fields?: string[];
  sort?: AirtableSort[];
  revalidateSeconds?: number;
};

type AirtableListResponse<TFields extends Record<string, unknown>> = {
  records: Array<{ id: string; fields: TFields }>;
  offset?: string;
};

function buildListUrl(
  baseId: string,
  params: AirtableListParams,
  offset?: string,
): string {
  const searchParams = new URLSearchParams();

  if (params.view) searchParams.set("view", params.view);
  if (params.filterByFormula) searchParams.set("filterByFormula", params.filterByFormula);
  if (params.fields?.length) {
    for (const field of params.fields) {
      searchParams.append("fields[]", field);
    }
  }
  if (params.sort?.length) {
    params.sort.forEach((sort, index) => {
      searchParams.set(`sort[${index}][field]`, sort.field);
      searchParams.set(`sort[${index}][direction]`, sort.direction ?? "asc");
    });
  }
  if (offset) searchParams.set("offset", offset);

  const pageSize = params.maxRecords ? Math.min(params.maxRecords, 100) : 100;
  searchParams.set("pageSize", String(pageSize));

  const query = searchParams.toString();
  return `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(params.tableName)}?${query}`;
}

/**
 * List records with automatic pagination until maxRecords or Airtable has no more pages.
 */
export async function listAirtableRecordsForBase<TFields extends Record<string, unknown>>(
  baseId: string,
  params: AirtableListParams,
): Promise<{ records: Array<{ id: string; fields: TFields }> }> {
  const token = requireAirtableToken();
  const records: Array<{ id: string; fields: TFields }> = [];
  let offset: string | undefined;

  do {
    const remaining =
      params.maxRecords !== undefined ? params.maxRecords - records.length : undefined;
    if (remaining !== undefined && remaining <= 0) break;

    const url = buildListUrl(
      baseId,
      {
        ...params,
        maxRecords: remaining !== undefined ? Math.min(remaining, 100) : params.maxRecords,
      },
      offset,
    );

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: params.revalidateSeconds ?? 60 },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new AirtableApiError(response.status, body);
    }

    const page = (await response.json()) as AirtableListResponse<TFields>;
    records.push(...page.records);
    offset = page.offset;
  } while (offset);

  if (params.maxRecords !== undefined && records.length > params.maxRecords) {
    return { records: records.slice(0, params.maxRecords) };
  }

  return { records };
}

/** List records from the Shooting Challenge base (default env). */
export async function listAirtableRecords<TFields extends Record<string, unknown>>(
  params: AirtableListParams,
): Promise<{ records: Array<{ id: string; fields: TFields }> }> {
  const { baseId } = requireAirtableConfig();
  return listAirtableRecordsForBase<TFields>(baseId, params);
}
