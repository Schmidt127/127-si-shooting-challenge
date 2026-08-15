import { listAirtableRecords } from "@/lib/airtable/client";
import {
  PUBLIC_AIRTABLE_TABLES,
  REGISTERING_SHOOTING_CHALLENGE_FILTER,
} from "@/lib/airtable/public-tables";
import { asText } from "@/lib/data/airtable-values";

export type RegisteringProgramInstance = {
  id: string;
  name: string;
  schoolYear: string;
};

type ProgramInstanceScopeFields = {
  "Name - Program Instance"?: unknown;
  "School Year - Linked"?: unknown;
  "Program - Linked"?: unknown;
  Status?: unknown;
  "Record Id"?: unknown;
};

const SCOPE_FIELDS = [
  "Name - Program Instance",
  "School Year - Linked",
  "Program - Linked",
  "Status",
  "Record Id",
] as const;

/**
 * Resolve the single Registering Shooting Challenge Program Instance.
 * Canonical name is validated at selection; callers scope enrollments/PHA by record id.
 */
export async function resolveRegisteringShootingChallengeProgramInstance(
  revalidateSeconds: number,
): Promise<RegisteringProgramInstance> {
  const programInstances = await listAirtableRecords<ProgramInstanceScopeFields>({
    tableName: PUBLIC_AIRTABLE_TABLES.programInstanceSync.name,
    fields: [...SCOPE_FIELDS],
    filterByFormula: REGISTERING_SHOOTING_CHALLENGE_FILTER,
    revalidateSeconds,
  });

  if (programInstances.records.length !== 1) {
    throw new Error(
      `Public site requires exactly one Registering Shooting Challenge Program Instance; found ${programInstances.records.length}.`,
    );
  }

  const programInstance = programInstances.records[0];
  const schoolYear = asText(programInstance.fields["School Year - Linked"], "");
  if (!schoolYear) {
    throw new Error("Current Shooting Challenge Program Instance is missing School Year - Linked.");
  }

  const expectedName = `Shooting Challenge | ${schoolYear}`;
  const name = asText(programInstance.fields["Name - Program Instance"], "");
  if (name !== expectedName) {
    throw new Error(
      `Standings Program Instance name must be exactly "${expectedName}"; found "${name || "(empty)"}".`,
    );
  }

  if (!programInstance.id.startsWith("rec")) {
    throw new Error("Current standings Program Instance is missing a valid record id.");
  }

  return { id: programInstance.id, name, schoolYear };
}
