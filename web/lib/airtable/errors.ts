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

/**
 * Visitor-safe error message for public pages.
 * Never expose raw Airtable response bodies (they can include base/table/view
 * internals). The missing-config hint is kept because it names only public
 * env-var names and unblocks deploy debugging.
 */
export function publicErrorMessage(error: unknown): string {
  if (error instanceof AirtableApiError) {
    return "Live data is temporarily unavailable. Please try again soon.";
  }
  if (error instanceof Error && error.message.includes("Missing Airtable configuration")) {
    return error.message;
  }
  return "An unexpected error occurred while fetching data.";
}

export function isMissingAirtableViewError(error: unknown): boolean {
  if (!(error instanceof AirtableApiError)) return false;

  if (error.status === 404) return true;

  return /VIEW_NAME_NOT_FOUND|view.*not found/i.test(error.body);
}
