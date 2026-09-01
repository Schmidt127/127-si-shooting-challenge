import { AirtableApiError } from "@/lib/airtable/errors";

export type HomeworkLoadFailureCategory =
  | "configuration"
  | "program_scope"
  | "airtable_permission"
  | "airtable_rate_limit"
  | "airtable_upstream"
  | "schedule_integrity"
  | "missing_library"
  | "unexpected";

export class HomeworkLoadError extends Error {
  readonly category: HomeworkLoadFailureCategory;
  readonly correlationId: string;
  readonly retryable: boolean;

  constructor(input: {
    category: HomeworkLoadFailureCategory;
    message: string;
    correlationId: string;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "HomeworkLoadError";
    this.category = input.category;
    this.correlationId = input.correlationId;
    this.retryable = input.retryable ?? false;
  }
}

export function classifyHomeworkLoadError(
  error: unknown,
  correlationId: string,
): HomeworkLoadError {
  if (error instanceof HomeworkLoadError) return error;

  if (error instanceof AirtableApiError) {
    if (error.status === 401 || error.status === 403) {
      return new HomeworkLoadError({
        category: "airtable_permission",
        message: "Homework data could not be read due to an upstream permission problem.",
        correlationId,
        retryable: false,
        cause: error,
      });
    }
    if (error.status === 429) {
      return new HomeworkLoadError({
        category: "airtable_rate_limit",
        message: "Homework is temporarily busy. Please try again in a moment.",
        correlationId,
        retryable: true,
        cause: error,
      });
    }
    if (error.status >= 500) {
      return new HomeworkLoadError({
        category: "airtable_upstream",
        message: "Live homework data is temporarily unavailable. Please try again soon.",
        correlationId,
        retryable: true,
        cause: error,
      });
    }
    return new HomeworkLoadError({
      category: "airtable_upstream",
      message: "Live homework data is temporarily unavailable. Please try again soon.",
      correlationId,
      retryable: true,
      cause: error,
    });
  }

  if (error instanceof Error) {
    if (error.message.includes("Missing Airtable configuration")) {
      return new HomeworkLoadError({
        category: "configuration",
        message: error.message,
        correlationId,
        retryable: false,
        cause: error,
      });
    }
    if (
      error.message.includes("Registering Shooting Challenge Program Instance") ||
      error.message.includes("School Year - Linked") ||
      error.message.includes("Program Instance name must be exactly")
    ) {
      return new HomeworkLoadError({
        category: "program_scope",
        message: "Homework could not be scoped to the current Shooting Challenge season.",
        correlationId,
        retryable: false,
        cause: error,
      });
    }
    if (error.message.includes("missing Homework Library record")) {
      return new HomeworkLoadError({
        category: "missing_library",
        message: "Published homework references curriculum that is not available right now.",
        correlationId,
        retryable: false,
        cause: error,
      });
    }
    if (error.message.includes("Multiple active PHA rows")) {
      return new HomeworkLoadError({
        category: "schedule_integrity",
        message: "Homework schedule has conflicting assignments and could not be published safely.",
        correlationId,
        retryable: false,
        cause: error,
      });
    }
  }

  return new HomeworkLoadError({
    category: "unexpected",
    message: "An unexpected error occurred while loading homework.",
    correlationId,
    retryable: true,
    cause: error,
  });
}

/** Visitor-safe copy — never expose Airtable bodies, record payloads, or correlation IDs. */
export function publicHomeworkErrorMessage(error: HomeworkLoadError): string {
  switch (error.category) {
    case "configuration":
      return error.message;
    case "program_scope":
      return "Homework for the current season is not available yet. Check back after registration opens.";
    case "airtable_permission":
      return "Homework could not be loaded right now. Our team has been notified.";
    case "airtable_rate_limit":
    case "airtable_upstream":
      return error.message;
    case "missing_library":
    case "schedule_integrity":
      return "Homework assignments are being updated. Please try again soon.";
    case "unexpected":
    default:
      return "Homework could not be loaded right now. Please try again.";
  }
}
