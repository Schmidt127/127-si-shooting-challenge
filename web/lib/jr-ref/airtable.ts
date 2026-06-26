import {
  getAirtableBaseConfigStatus,
  listAirtableRecordsForBase,
  type AirtableConfigStatus,
  type AirtableListParams,
} from "@/lib/airtable/client";

import { JR_REF_AIRTABLE_BASE_ENV, requireJrRefAirtableBaseId } from "./config";

export function getJrRefAirtableConfigStatus(): AirtableConfigStatus {
  return getAirtableBaseConfigStatus(JR_REF_AIRTABLE_BASE_ENV);
}

export async function listJrRefRecords<TFields extends Record<string, unknown>>(
  params: AirtableListParams,
): Promise<{ records: Array<{ id: string; fields: TFields }> }> {
  const baseId = requireJrRefAirtableBaseId();
  return listAirtableRecordsForBase<TFields>(baseId, params);
}
