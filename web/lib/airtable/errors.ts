/** Structured error for failed Airtable REST responses. */
export class AirtableApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`Airtable request failed (${status}): ${body}`);
    this.name = "AirtableApiError";
    this.status = status;
    this.body = body;
  }
}

export function isMissingAirtableViewError(error: unknown): boolean {
  if (!(error instanceof AirtableApiError)) return false;

  if (error.status === 404) return true;

  return /VIEW_NAME_NOT_FOUND|view.*not found/i.test(error.body);
}
