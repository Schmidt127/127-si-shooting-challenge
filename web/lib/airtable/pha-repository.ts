import { listAirtableRecords } from "@/lib/airtable/client";
import { PHA_AIRTABLE_FIELDS } from "@/lib/airtable/pha-field-map";
import { PUBLIC_AIRTABLE_TABLES } from "@/lib/airtable/public-tables";
import type { RegisteringProgramInstance } from "@/lib/airtable/registering-program-instance";
import {
  parseActivePhaScheduleRows,
  type ProgramHomeworkAssignmentScheduleFields,
} from "@/lib/data/homework";
import {
  createCorrelationId,
  logPublicLoad,
} from "@/lib/observability/public-load-log";

const PHA_LIST_FIELDS = [
  PHA_AIRTABLE_FIELDS.homeworkAssignment,
  PHA_AIRTABLE_FIELDS.programInstance,
  PHA_AIRTABLE_FIELDS.programInstanceRid,
  PHA_AIRTABLE_FIELDS.week,
  PHA_AIRTABLE_FIELDS.gradeBand,
  PHA_AIRTABLE_FIELDS.homeworkSlot,
  PHA_AIRTABLE_FIELDS.active,
  PHA_AIRTABLE_FIELDS.dueDate,
  PHA_AIRTABLE_FIELDS.operatorNotes,
  PHA_AIRTABLE_FIELDS.scheduleKey,
  PHA_AIRTABLE_FIELDS.completionsCount,
] as const;

function escapeAirtableString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function activePhaFilterForProgramInstance(programInstanceId: string): string {
  return `AND({${PHA_AIRTABLE_FIELDS.active}}=1,FIND('${escapeAirtableString(programInstanceId)}',ARRAYJOIN({${PHA_AIRTABLE_FIELDS.programInstanceRid}})))`;
}

function buildPhaPriorityMap(scheduledPhaIds: string[]): Map<string, number> {
  const priority = new Map<string, number>();
  scheduledPhaIds.forEach((id, index) => {
    if (id && !priority.has(id)) priority.set(id, index);
  });
  return priority;
}

export type ActivePhaLoadResult = {
  records: Array<{ id: string; fields: ProgramHomeworkAssignmentScheduleFields }>;
  parseResult: ReturnType<typeof parseActivePhaScheduleRows>;
  correlationId: string;
};

/** Read active PHA schedule rows for one Registering Program Instance. */
export async function loadActivePhaSchedule(input: {
  programInstance: RegisteringProgramInstance;
  revalidateSeconds: number;
  correlationId?: string;
  operation?: string;
}): Promise<ActivePhaLoadResult> {
  const correlationId = input.correlationId ?? createCorrelationId();
  const operation = input.operation ?? "pha.loadActiveSchedule";
  const started = Date.now();

  const response = await listAirtableRecords<ProgramHomeworkAssignmentScheduleFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.programHomeworkAssignments.name,
    maxRecords: 8000,
    fields: [...PHA_LIST_FIELDS],
    filterByFormula: activePhaFilterForProgramInstance(input.programInstance.id),
    revalidateSeconds: input.revalidateSeconds,
  });

  const parseResult = parseActivePhaScheduleRows(response.records, {
    programInstanceId: input.programInstance.id,
    programInstancePhaPriority: buildPhaPriorityMap(input.programInstance.scheduledPhaIds),
  });

  logPublicLoad({
    correlationId,
    operation,
    level: parseResult.resolvedDuplicateSlotKeys.length > 0 ? "warn" : "info",
    category: parseResult.resolvedDuplicateSlotKeys.length > 0 ? "pha_duplicate_resolved" : "pha_load_ok",
    durationMs: Date.now() - started,
    safeDetail: {
      programInstanceId: input.programInstance.id,
      rawActiveCount: response.records.length,
      schedulableCount: parseResult.rows.length,
      skippedIncomplete: parseResult.skippedIncomplete,
      resolvedDuplicateCount: parseResult.resolvedDuplicateSlotKeys.length,
      unresolvedDuplicateCount: parseResult.duplicateSlotKeys.length,
    },
  });

  if (parseResult.resolvedDuplicateSlotKeys.length > 0) {
    logPublicLoad({
      correlationId,
      operation,
      level: "warn",
      category: "pha_duplicate_slots",
      safeDetail: {
        slots: parseResult.resolvedDuplicateSlotKeys.join(","),
      },
    });
  }

  return { records: response.records, parseResult, correlationId };
}

export async function listCurrentPhaRecordsForProgramInstance(
  programInstance: RegisteringProgramInstance,
  revalidateSeconds: number,
): Promise<Array<{ id: string; fields: ProgramHomeworkAssignmentScheduleFields }>> {
  const result = await loadActivePhaSchedule({ programInstance, revalidateSeconds });
  return result.records;
}
